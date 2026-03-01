import socket

PORT = 6700

history_back = []
history_forward = []

address = input("enter an IHCURL: ")

def fetch(addr):

    ip, file = address.split("/", 1)

    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client.connect((ip, PORT))

    message = f"GIVE {file}\n".encode()
    client.sendall(message)

    chunks = []
    while True:
        data = client.recv(1024)
        if not data:
            break
        chunks.append(data)

    client.close()
    return b"".join(chunks).decode()


while True:

    print("\nIHC-URL:", address)

    response = fetch(address)
    print(response)

    cmd = input("\n(/back/forward/open/search/quit)> ").strip()

    if cmd == "quit":
        break

    elif cmd.startswith("open "):
        target = cmd.split(" ", 1)[1]
        history_back.append(address)
        address = target
        history_forward.clear()

    elif cmd == "back":
        if history_back:
            history_forward.append(address)
            address = history_back.pop()
        else:
            print("no back history")

    elif cmd == "forward":
        if history_forward:
            history_back.append(address)
            address = history_forward.pop()
        else:
            print("no forward history")

    elif cmd.startswith("search "):
        target = cmd.split(" ", 1)[1]
        history_back.append(address)
        address = target
        history_forward.clear()

    else:
        print("unknown command")
