#!/bin/bash
if [ -z "$TMUX" ]; then
    echo $'\e[1;31mNot in a tmux window\e[m'
    exit 1
fi

mkfifo bridge > /dev/null 2>&1

tmux split-window  "node server.js"
tmux split-window -t {top} -h "script -f bridge" 
tmux swap-pane -s {top-left} -t {top-right}
tmux resize-pane -t {top-left} -x 63 -y 28
