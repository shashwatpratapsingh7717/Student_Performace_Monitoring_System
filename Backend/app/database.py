import psycopg2

def get_db_connection():
    return psycopg2.connect(
        dbname="student_monitoring", 
        user="postgres",
        password="12345",
        host="localhost",
        port="5432"
    )