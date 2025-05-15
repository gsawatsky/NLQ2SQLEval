from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.models.snowflake_connection import SnowflakeConnection
from app import get_db
from snowflake.connector import connect, Error as SnowflakeError
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/snowflake", tags=["snowflake"])

@router.get("/connections", response_model=List[dict])
async def get_connections(db: Session = Depends(get_db)):
    try:
        print('Fetching Snowflake connections...')
        connections = db.query(SnowflakeConnection).all()
        result = [conn.to_dict() for conn in connections]
        print(f'Found {len(result)} Snowflake connections')
        for conn in result:
            print(f"Connection: {conn['name']} (ID: {conn['id']})")
        return result
    except Exception as e:
        print(f'Error fetching Snowflake connections: {str(e)}')
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/connections", response_model=dict)
async def create_connection(connection: dict, db: Session = Depends(get_db)):
    try:
        # Validate required fields
        required_fields = ['name', 'user', 'password', 'account', 'warehouse', 'role']
        if not all(field in connection for field in required_fields):
            raise HTTPException(status_code=400, detail='Missing required fields')

        # Create new connection - password will be encrypted by the model's setter
        new_connection = SnowflakeConnection(
            name=connection['name'],
            user=connection['user'],
            password=connection['password'],  # This will be encrypted by the model
            account=connection['account'],
            warehouse=connection['warehouse'],
            role=connection['role'],
            database=connection.get('database'),
            schema=connection.get('schema'),
            is_sso=connection.get('is_sso', False)
        )

        # Test the connection using the decrypted password
        try:
            conn = connect(
                user=new_connection.user,
                password=new_connection.password,  # This gets decrypted by the model
                account=new_connection.account,
                warehouse=new_connection.warehouse,
                role=new_connection.role,
                database=new_connection.database,
                schema=new_connection.schema
            )
            # Test the connection with a simple query
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            conn.close()
        except Exception as e:
            logger.error(f"Connection test failed: {str(e)}", exc_info=True)
            raise HTTPException(status_code=400, detail=f'Connection test failed: {str(e)}')

        db.add(new_connection)
        db.commit()
        db.refresh(new_connection)
        return new_connection.to_dict()

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/connections/{connection_id}")
async def delete_connection(connection_id: int, db: Session = Depends(get_db)):
    try:
        connection = db.query(SnowflakeConnection).filter(SnowflakeConnection.id == connection_id).first()
        if not connection:
            raise HTTPException(status_code=404, detail="Connection not found")
        
        db.delete(connection)
        db.commit()
        return {"message": "Connection deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/execute-sql")
async def execute_sql(request: dict, db: Session = Depends(get_db)):
    """
    Execute SQL query on Snowflake
    
    Request body should be:
    {
        "connection_id": int,  # Required
        "sql": "SELECT * FROM table"  # Required
    }
    """
    try:
        sql = request.get('sql')
        connection_id = request.get('connection_id')
        
        if not sql:
            raise HTTPException(status_code=400, detail='SQL query is required')
        if not connection_id:
            raise HTTPException(status_code=400, detail='connection_id is required')
            
        # Get the connection
        connection = db.query(SnowflakeConnection).get(connection_id)
        if not connection:
            raise HTTPException(status_code=404, detail=f'Connection with ID {connection_id} not found')
        
        logger.info(f"Executing SQL with connection: {connection.name} (ID: {connection.id})")
        
        # Connect to Snowflake using the connection's get_connection_params()
        # which will handle the decrypted password
        conn_params = connection.get_connection_params()
        
        try:
            conn = connect(**conn_params)
            cursor = conn.cursor()
            
            # Execute the query
            cursor.execute(sql)
            
            # If it's a SELECT query, return results
            if cursor.description:
                columns = [desc[0] for desc in cursor.description]
                rows = cursor.fetchall()
                
                # Convert rows to list of dicts
                result = [dict(zip(columns, row)) for row in rows]
                
                return {
                    'status': 'success',
                    'data': result,
                    'row_count': len(result)
                }
            else:
                # For non-SELECT queries, return success with affected rows
                return {
                    'status': 'success',
                    'message': f'Query executed successfully. Rows affected: {cursor.rowcount}'
                }
            
        except SnowflakeError as e:
            logger.error(f"Snowflake error: {str(e)}", exc_info=True)
            raise HTTPException(status_code=400, detail=f"Snowflake error: {str(e)}")
            
        except Exception as e:
            logger.error(f"Error executing query: {str(e)}", exc_info=True)
            raise HTTPException(status_code=400, detail=str(e))
            
        finally:
            if 'cursor' in locals() and cursor:
                cursor.close()
            if 'conn' in locals() and conn:
                conn.close()
                
    except HTTPException:
        raise
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.post("/test-connection")
async def test_connection(connection: dict):
    """
    Test a Snowflake connection
    
    Request body should be:
    {
        "user": "username",
        "password": "password",  # Required if not using SSO
        "account": "account_identifier",
        "warehouse": "warehouse_name",
        "role": "role_name",
        "database": "database_name",  # Optional
        "schema": "schema_name",      # Optional
        "is_sso": false,              # Optional, defaults to false
        "authenticator": "externalbrowser"  # Optional, for SSO
    }
    """
    try:
        # Validate required fields
        required_fields = ['user', 'account', 'warehouse', 'role']
        if not all(field in connection for field in required_fields):
            raise HTTPException(
                status_code=400, 
                detail=f'Missing required fields: {required_fields}'
            )

        conn = None
        try:
            conn_params = {
                'user': connection['user'],
                'account': connection['account'],
                'warehouse': connection['warehouse'],
                'role': connection['role'],
            }
            
            # Add optional fields if they exist
            if 'database' in connection and connection['database']:
                conn_params['database'] = connection['database']
            if 'schema' in connection and connection['schema']:
                conn_params['schema'] = connection['schema']
            
            # Handle SSO or password authentication
            if connection.get('is_sso', False):
                conn_params['authenticator'] = 'externalbrowser'
            else:
                if 'password' not in connection or not connection['password']:
                    raise HTTPException(
                        status_code=400, 
                        detail='Password is required when not using SSO'
                    )
                conn_params['password'] = connection['password']
            
            logger.info(f"Testing connection to account: {connection['account']}")
            
            # Test the connection
            conn = connect(**conn_params)
            
            # Run a simple query to verify connection
            with conn.cursor() as cursor:
                cursor.execute("SELECT current_version(), current_database(), current_schema()")
                version, database, schema = cursor.fetchone()
            
            return {
                'success': True,
                'snowflake_version': version,
                'database': database,
                'schema': schema,
                'message': 'Connection successful!'
            }
            
        except SnowflakeError as e:
            logger.error(f"Snowflake connection test failed: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to connect to Snowflake: {str(e)}"
            )
            
        except Exception as e:
            logger.error(f"Connection test error: {str(e)}", exc_info=True)
            raise HTTPException(status_code=400, detail=str(e))
            
        finally:
            if conn is not None:
                try:
                    conn.close()
                except Exception as e:
                    logger.error(f"Error closing connection: {str(e)}")
                
    except HTTPException:
        raise
        
    except Exception as e:
        logger.error(f"Unexpected error in test_connection: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected error occurred: {str(e)}"
        )
