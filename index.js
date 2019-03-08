//Walters Web App
//Created by Walter Alvarez
//version: 3/7/2019 "Final Submission"

var express = require('express');
var app = express();
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var moniker = require('moniker');


var numUsers = 0;
var usersList = [];
var usersMaster = [];
var messageList = [];
var names = moniker.generator([moniker.adjective, moniker.noun]);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    var addedUser = false;
    socket.on('new message', (data) => {
        // we tell the client to execute 'new message'
        io.emit('new message', {
            username: socket.username,
            usercolor: socket.usercolor,
            message: data
        });

    });

    //append message to chat list
    socket.on('append list', (data) => {
        if (messageList[messageList.length - 1] === data) {
        }
        else {messageList.push(data);}
    });

    // when the client emits 'add user', this listens and executes
    socket.on('add user', (data) => {
        if (addedUser) return;
        // we store the username in the socket session for this client
        if (data !== undefined) {
            socket.username = data.username;
            socket.usercolor = data.usercolor;
        }
        //no cookies were present, assign values for nickname and color
        else {
            socket.username = names.choose();
            socket.usercolor = -1;
        }

        //check if user is already online (multiple tabs in same browser)
        let j = usersList.indexOf(socket.username);
        usersList.push(socket.username);
        usersMaster.push(socket.username);

        //if not, increment user count
        if (j < 0) {
            ++numUsers;
            // echo globally (all clients) that a person has connected
            socket.broadcast.emit('user joined', {
                username: socket.username,
                numUsers: numUsers,
                usersList: usersList
            });
        }

        addedUser = true;
        socket.emit('load prev', messageList);      //load chat messages from prior to user joining
        socket.emit('login', {
            username: socket.username,
            usercolor: socket.usercolor,
            numUsers: numUsers
        });

        //update list of online users
        io.emit('online list', {
            usersList: usersList
        });
    });

    //change user's nickname
    socket.on('update name', function(username, callback){
        console.log(usersMaster);
        console.log(socket.username);
        let j = usersMaster.indexOf(username);          //index val of desired nickname in master users list
        let k = usersList.indexOf(socket.username);     //index val of current nickname in online list
        let l = usersMaster.indexOf(socket.username);   //index val of current nickname in master users list

        //if nickname not in master list, allow user to change name
        //prevents swiping nicknames from a user who has closed the tab but not the browser
        if (j < 0) {
            usersList[k] = username;
            usersMaster[l] = username;
            socket.username = username;
            callback(true);

            //update list of online users
            io.emit('online list', {
                usersList: usersList
            });
        }
        callback(false);
    });

    socket.on('update color', function(userColor, callback) {
        //Convert color value to int then back to string and pad start with 0
        var paddedVal = parseInt(userColor, 16).toString(16).padStart(6, '0');

        //if value of operation returns string of same value that was passed in, the userColor was valid Hex
        if (paddedVal === userColor) {
            socket.usercolor = "#" + userColor;
            callback(true);
        }
        callback(false);
    });

    // when the user disconnects, perform this
    socket.on('disconnect', () => {
        if (addedUser) {
            //remove this instance of user that has disconnected from online list
            //necessary since same user can be added to list due to opening multiple tabs
            let j = usersList.indexOf(socket.username);
            usersList.splice(j, 1);
            //update online user list
            socket.broadcast.emit('online list', {
                usersList: usersList
            });

            //if user is no longer present at all in online list, decrease user connected count
            j = usersList.indexOf(socket.username);
            if (j < 0) {
                --numUsers;
                // echo globally that this client has left
                socket.broadcast.emit('user left', {
                    username: socket.username,
                    numUsers: numUsers
                });
            }
        }
    });
});

http.listen(port, function(){
    console.log('listening on *:' + port);
});


