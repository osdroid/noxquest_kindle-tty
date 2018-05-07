# kindle-tty

Wouldn't it be cool to program on an e-ink device, like the kindle? Well, maybe not with the limited processing power of the kindle, but rather use it just as a screen? That is the purpose of this project! The refresh rate is not very good, but so far seems usable.

![kindle](kindle-tty.jpg)

**Note**: This is part of my personal trinkets, most probably it needs some tweaking before you can use it.
Currently I'm using a Kindle Paperwhite with firmware 5.9.4

The experimental browser on the Kindle is quite cool, it supports some modern features! Of special interest, is the WebSocket support! As it would allow me to keep an open connection, and sync it live!

## How do I run it?
1) I'm usually inside tmux  
2) ./run.sh  
This will split the screen, start node, and the script session (on the top-left pane)  
3) Open http://ip-machine:20001/ on the kindle  
4) Enjoy! The "scripted" top-left pane will be replicated on the kindle  

I absolutely enjoy using less, and of course (man command) on that pane. Makes reading really nice!