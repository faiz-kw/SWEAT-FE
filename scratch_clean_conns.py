import psycopg2

try:
    conn = psycopg2.connect("dbname=postgres user=postgres host=localhost port=5432")
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT pid, usename, client_addr, state, query FROM pg_stat_activity WHERE pid != pg_backend_pid();")
    rows = cur.fetchall()
    print(f"Total connections: {len(rows)}")
    for r in rows[:10]:
        print(f"  PID {r[0]}: {r[1]} | {r[3]} | {r[4][:40] if r[4] else ''}")
    
    cur.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid != pg_backend_pid() AND state = 'idle';")
    terminated = cur.fetchall()
    print(f"Terminated {len(terminated)} idle connections!")
    conn.close()
except Exception as e:
    print("Error:", e)
