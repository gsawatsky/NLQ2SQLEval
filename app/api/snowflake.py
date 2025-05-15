from flask import Blueprint, request, jsonify
from app.models.snowflake_connection import SnowflakeConnection
from app import db
from sqlalchemy.exc import SQLAlchemyError
from snowflake.connector import connect

snowflake_bp = Blueprint('snowflake', __name__)

@snowflake_bp.route('/api/snowflake/connections', methods=['GET', 'OPTIONS'])
def get_connections():
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'GET')
        return response
        
    try:
        print('Fetching Snowflake connections...')
        connections = SnowflakeConnection.query.all()
        result = [conn.to_dict() for conn in connections]
        print(f'Found {len(result)} Snowflake connections')
        for conn in result:
            print(f"Connection: {conn['name']} (ID: {conn['id']})")
        response = jsonify(result)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
    except SQLAlchemyError as e:
        print(f'Error fetching Snowflake connections: {str(e)}')
        response = jsonify({'error': str(e)})
        response.status_code = 500
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

@snowflake_bp.route('/api/snowflake/connections', methods=['POST'])
def create_connection():
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['name', 'user', 'password', 'account', 'warehouse', 'role']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        # Create new connection
        connection = SnowflakeConnection(
            name=data['name'],
            user=data['user'],
            password=data['password'],
            account=data['account'],
            warehouse=data['warehouse'],
            role=data['role'],
            is_sso=data.get('is_sso', False)
        )

        # Test the connection
        try:
            conn = connect(
                user=data['user'],
                password=data['password'],
                account=data['account'],
                warehouse=data['warehouse'],
                role=data['role']
            )
            conn.close()
        except Exception as e:
            return jsonify({'error': f'Connection test failed: {str(e)}'}), 400

        db.session.add(connection)
        db.session.commit()
        return jsonify(connection.to_dict()), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@snowflake_bp.route('/api/snowflake/connections/<int:connection_id>', methods=['DELETE'])
def delete_connection(connection_id):
    try:
        connection = SnowflakeConnection.query.get_or_404(connection_id)
        db.session.delete(connection)
        db.session.commit()
        return '', 204
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@snowflake_bp.route('/api/snowflake/execute-sql', methods=['POST'])
def execute_sql():
    try:
        data = request.json
        sql = data.get('sql')
        connection_id = data.get('connection_id')
        
        if not sql:
            return jsonify({'error': 'SQL query is required'}), 400
            
        connection = None
        if connection_id:
            connection = SnowflakeConnection.query.get(connection_id)
            if not connection:
                return jsonify({'error': 'Invalid connection ID'}), 400
                
        # Use the connection if provided, otherwise fall back to default
        if connection:
            conn = connect(
                user=connection.user,
                password=connection.password,
                account=connection.account,
                warehouse=connection.warehouse,
                role=connection.role,
                database=connection.database,
                schema=connection.schema
            )
        else:
            # Fallback to default connection
            conn = connect(
                user='SYSTEM1_USER',
                password='SYSTEM1_PASSWORD',
                account='SYSTEM1_ACCOUNT',
                warehouse='SYSTEM1_WAREHOUSE',
                role='SYSTEM1_ROLE'
            )
            
        try:
            cursor = conn.cursor()
            cursor.execute(sql)
            
            # Get column names
            columns = [desc[0] for desc in cursor.description]
            
            # Fetch all rows
            rows = cursor.fetchall()
            
            return jsonify({
                'columns': columns,
                'rows': rows,
                'error': None
            })
            
        except Exception as e:
            return jsonify({
                'columns': [],
                'rows': [],
                'error': str(e)
            }), 400
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        return jsonify({
            'columns': [],
            'rows': [],
            'error': str(e)
        }), 500


@snowflake_bp.route('/api/snowflake/test', methods=['POST'])
def test_connection():
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['user', 'account', 'warehouse', 'role']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        # Test the connection
        conn = None
        try:
            if data.get('is_sso', False):
                conn = connect(
                    user=data['user'],
                    authenticator='externalbrowser',
                    account=data['account'],
                    warehouse=data['warehouse'],
                    role=data['role'],
                    database=data.get('database'),
                    schema=data.get('schema')
                )
            else:
                if 'password' not in data:
                    return jsonify({'error': 'Missing password field'}), 400
                conn = connect(
                    user=data['user'],
                    password=data['password'],
                    account=data['account'],
                    warehouse=data['warehouse'],
                    role=data['role'],
                    database=data.get('database'),
                    schema=data.get('schema')
                )
            
            # Run a simple query to verify connection
            cursor = conn.cursor()
            cursor.execute("SELECT current_version()")
            result = cursor.fetchone()
            cursor.close()
            
        except Exception as e:
            if conn:
                conn.close()
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
        finally:
            if conn:
                conn.close()

        return jsonify({
            'success': True,
            'snowflake_version': result[0]
        })

        return jsonify({
            'success': True,
            'snowflake_version': result[0]
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
