import argparse
import re
import socket
import subprocess
import stat
import os

def is_valid_ip(address):
    try: 
        socket.inet_aton(address)
        return True
    except:
        return False

def is_valid_hostname(hostname):
    if len(hostname) > 255:
        return False
    if hostname[-1] == '.':
        hostname = hostname[:-1] # strip exactly one dot from the right, if present
    allowed = re.compile(r'(?!-)[A-Z\d-]{1,63}(?<!-)$', re.IGNORECASE)
    return all(allowed.match(x) for x in hostname.split('.'))

def is_valid_port(port):
    try:
        port = int(port)
        if 1 <= port <= 65535:
            return True
        else:
            raise ValueError
    except ValueError:
        return False

## Process input args
# cli args
parser = argparse.ArgumentParser(description = 'Configure Graph Cities server address and ports')
parser.add_argument('-a', '--address',
                    help = 'your server IPv4 address or hostname')

parser.add_argument('-c', '--city_port',
                    help = 'your server port for Graph City web view')

parser.add_argument('-s', '--strata_port',
                    help = 'your server port for Graph Strata')

args = parser.parse_args()

# if not provided, ask for input
if args.address is None:
    address = input('Please input your server IPv4 address or hostname:\n')
else:
    address = args.address

if not (is_valid_ip(address) or is_valid_hostname(address)):
    print('address is not valid.')
    exit(-1)

if args.city_port is None:
    city_port = input('Please input your server port for Graph City web view:\n')
else:
    city_port = args.city_port

if not is_valid_port(city_port):
    print('city_port is not valid.')
    exit(-1)

if args.strata_port is None:
    strata_port = input('Please input your server port for Graph Strata:\n')
else:
    strata_port = args.strata_port

if not is_valid_port(strata_port):
    print('strata_port is not valid.')
    exit(-1)

def confirm():
    answer = ''
    while answer not in ['y', 'n']:
        answer = input('Is this okay? Y/N').lower()
    return answer == 'y'

## Confirmation
print(f'Your Graph City will be hosted at http://{address}:{city_port}/')
print(f'Your Graph City will be hosted at http://{address}:{strata_port}/')
if not confirm():
    print('Cancled.')
    exit(-1)

## prepare .sh
with open(f'config.sh', 'w', newline = '') as f:
    f.write('#!/bin/sh\n')

    line = f'export const strataAddress = "http://{address}:{strata_port}/"'
    f.write(f"sed -i '1c {line}' fpViewer/localLib/strata.js\n")

    line = f'node app.js temp=./temp port={strata_port}'
    f.write(f"sed -i '2c {line}' graph-strata/run.sh\n")

    line = f'const localPort = {city_port}'
    f.write(f"sed -i '13c {line}' Graph_City_Web/app_addon.js\n")

    line = f'const strataAddress = "http://{address}:{strata_port}/"'
    f.write(f"sed -i '16c {line}' Graph_City_Web/app_addon.js\n")

    line = f'const hostAddress = "http://{address}:{city_port}"'
    f.write(f"sed -i '24c {line}' Graph_City_Web/scripts/main.js\n")

    line = f'const localHost = `http://{address}:{city_port}/`'
    f.write(f"sed -i '25c {line}' Graph_City_Web/scripts/main.js\n")

    line = f'const localHost = `http://{address}:{city_port}/`'
    f.write(f"sed -i '6c {line}' Graph_City_Web/scripts/main.js\n")

    line = f'const hostAddress = "http://{address}:{city_port}"'
    f.write(f"sed -i '7c {line}' Graph_City_Web/scripts/dag_view_server.js\n")

    line = f'var PREFIX = "http://{address}:{strata_port}/"'
    f.write(f"sed -i '9c {line}' Graph_City_Web/scripts/dag_view_server.js\n")

## run .sh
st = os.stat('config.sh')
os.chmod('config.sh', st.st_mode | stat.S_IEXEC)
shellscript = subprocess.Popen(['./config.sh'], stdin=subprocess.PIPE)
returncode = shellscript.returncode
