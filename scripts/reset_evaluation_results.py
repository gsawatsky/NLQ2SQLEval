import os
import sys
import click
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import func

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import engine, Base
from app.models.core import GeneratedResult, NLQ, ValidationRun

def confirm_deletion():
    """Ask for confirmation before deleting all test data"""
    click.echo("\n⚠️ WARNING: This will completely reset ALL test data!")
    click.echo("This action will delete ALL rows from the following tables:")
    click.echo("- generated_results")
    click.echo("- nlqs")
    click.echo("- validation_runs")
    click.echo("\nThis action CANNOT be undone and will wipe out all your test results and configurations.")
    if not click.confirm("\nAre you ABSOLUTELY sure you want to proceed?"):
        click.echo("\nOperation cancelled.")
        return False
    return True

def delete_all_test_data():
    """Delete all rows from test-related tables in the correct order to maintain referential integrity"""
    # Create a session
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Get counts before deletion
        counts_before = {
            'generated_results': session.query(GeneratedResult).count(),
            'nlqs': session.query(NLQ).count(),
            'validation_runs': session.query(ValidationRun).count()
        }
        
        # Delete in the correct order to maintain referential integrity
        session.query(GeneratedResult).delete()
        session.query(NLQ).delete()
        session.query(ValidationRun).delete()
        
        # Commit all deletions
        session.commit()
        
        # Get counts after deletion
        counts_after = {
            'generated_results': session.query(GeneratedResult).count(),
            'nlqs': session.query(NLQ).count(),
            'validation_runs': session.query(ValidationRun).count()
        }
        
        # Print summary
        click.echo("\nDeletion Summary:")
        for table, before_count in counts_before.items():
            after_count = counts_after[table]
            click.echo(f"{table}: Deleted {before_count} rows (Current count: {after_count})")
        
    except Exception as e:
        session.rollback()
        click.echo(f"\nError occurred: {str(e)}")
        raise
    finally:
        session.close()

def main():
    if confirm_deletion():
        delete_all_test_data()
    else:
        click.echo("\nOperation cancelled.")

if __name__ == "__main__":
    main()
