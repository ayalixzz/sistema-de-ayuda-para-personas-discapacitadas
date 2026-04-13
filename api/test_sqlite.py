from sqlalchemy import create_engine
engine_kwargs = {
    "pool_pre_ping": True,
    "pool_recycle": 300,
    "pool_size": 5,
    "max_overflow": 10,
    "connect_args": {
        "keepalives": 1,
    }
}
try:
    engine = create_engine("sqlite:///test.db", **engine_kwargs)
    print("Success")
except Exception as e:
    print(f"Error: {e}")
