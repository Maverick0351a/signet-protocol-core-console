from uvicorn import run

if __name__ == "__main__":
    run("server.main:app", host="127.0.0.1", port=8088, reload=False, workers=1)
