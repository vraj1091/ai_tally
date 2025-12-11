import sqlite3
import os

try:
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(tally_cache)")
    columns = [row[1] for row in cursor.fetchall()]
    
    with open('schema_check.txt', 'w') as f:
        f.write(f"Columns: {columns}\n")
        f.write(f"Has last_updated: {'last_updated' in columns}\n")
        f.write(f"Has source: {'source' in columns}\n")
        
    conn.close()
except Exception as e:
    with open('schema_check.txt', 'w') as f:
        f.write(f"Error: {e}")
