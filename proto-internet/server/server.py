import socket
import subprocess

HOST = "0.0.0.0"
PORT = 6700

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind((HOST, PORT))
server.listen()

print(f"LISTENING ON: {HOST}:{PORT}")

while True:
    conn, addr = server.accept()
    print(f"{addr} CONNECTED")

    data = conn.recv(1024)
    if not data:
        conn.close()
        continue

    msg = data.decode().strip()
    print("GOT:", msg)

    parts = msg.split()
    filename = "pages/" + parts[1]

    if parts[1] == "KILL":
        conn.close()
        break # this is just for testing purposes

    try:
        with open(filename, "r", encoding="utf-8") as f:
            content = f.read()

        if filename.endswith(".ihx"):
            output = subprocess.check_output(
                ["python3", filename],
                text=True
            )
            message = ("FINE " + output + "\n").encode()
        else:
            message = ("FINE " + content + "\n").encode()

        print("FINE")
        conn.sendall(message)

    except Exception as e:
        print("ERRO")
        conn.sendall(f"ERRO {e}\n".encode())

    conn.close()

server.close()