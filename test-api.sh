#!/bin/bash
# ble-iot-gwy api test
# 19-sep-29 first skelton test manually on raspi
# 19-oct-04 test script created and skelton test done on raspi
# 19-oct-06 reduced to only supported apis
# 19-oct-08 tested noble version on windows
# 19-oct-09 sse tested too
# 19-oct-13 put value test
# 19-oct-15 api change (sig-api -> alt-api)

#SERVER=big:3000
SERVER=localhost:3000

ADDR=c0:ab:2a:6a:1a:89
S_UUID=180f
C_UUID=2a19

# ADDR=C0AB2A6A1A89
# S_UUID=18-0F
# C_UUID=2A-19

# list of nodes
#curl -s http://$SERVER/altapi/nodes
#curl -s http://$SERVER/altapi/nodes?connectable=1

# services and items
#curl -s http://$SERVER/altapi/nodes/$ADDR
#curl -s http://$SERVER/altapi/nodes/$ADDR/services
#curl -s http://$SERVER/altapi/nodes/$ADDR/services/$S_UUID/items

# read item
#curl -s http://$SERVER/altapi/nodes/$ADDR/services/$S_UUID/items/$C_UUID/value

# write item (inline version)
#curl -s -T - http://$SERVER/altapi/nodes/$ADDR/services/$S_UUID/items/$C_UUID/value/0200 <<< "dummy"
#curl -s -T - http://$SERVER/altapi/nodes/$ADDR/services/$S_UUID/items/$C_UUID/value/0200?noresponse=1 <<< "dummy"

# write item - value conversion (put-value-test-19oct13.png)
#curl -s -T - http://$SERVER/altapi/nodes/$ADDR/services/$S_UUID/items/$C_UUID/value/~hk <<< "dummy"
#curl -s -T - http://$SERVER/altapi/nodes/$ADDR/services/$S_UUID/items/$C_UUID/value/.2.1 <<< "dummy"
#curl -s -T - http://$SERVER/altapi/nodes/$ADDR/services/$S_UUID/items/$C_UUID/value/.2.-1 <<< "dummy"
#curl -s -T - http://$SERVER/altapi/nodes/$ADDR/services/$S_UUID/items/$C_UUID/value/.2.65535 <<< "dummy"
#curl -s -T - http://$SERVER/altapi/nodes/$ADDR/services/$S_UUID/items/$C_UUID/value/~%20%20 <<< "dummy"

# notify/indicate by server-sent events
curl -s http://$SERVER/altapi/nodes/$ADDR/services/$S_UUID/items/$C_UUID/report
