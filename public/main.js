//Walters Web App
//Created by Walter Alvarez
//version: 3/7/2019 "Final Submission"

$(function() {
    var COLORS = [
        'e21400', '91580f', 'f8a700',
        'f78b00', '287b00', '4ae8c4',
        '3b88eb', '3824aa', 'a700ff', 'd300e7'
    ];

    var username;
    var socket = io();

    // Whenever the server emits 'user joined', log it in the chat body
    socket.on('user joined', (data) => {
        log(data.username + ' joined');
        usersConnectedMessage(data);
    });

    socket.on('online list', (data) => {
        $('#users').empty();
        //same user can be added to usersList multiple times server side, if multiple tabs opened in same browser
        //unique array makes sure we only log each unique user once
        let uniqueArray = data.usersList.filter(function(item, pos) {
            return data.usersList.indexOf(item) === pos;
        });
        //sort and then reverse to ensure users are displayed alphabetically reading from top-down
        uniqueArray.reverse();
        uniqueArray.forEach(function(item, index, array) {
            var $userElem = $('<li>').addClass('log').text(item);
            $('#users').append($userElem);
        });
    });

    // Whenever the server emits 'new message', update the chat body
    socket.on('new message', (data) => {
        addChatMessage(data);
    });

    const usersConnectedMessage = (data) => {
        //when user logs in, tell them how many people there are in chat room
        var message = '';
        if (data.numUsers === 1) {
            message += "There's 1 user connected";
        } else {
            message += "There are " + data.numUsers + " users connected";
        }
        log(message);
    };

    const setUsername = () => {
        //no cookies, add new user
        if (!(document.cookie.split(';').filter((item) => item.trim().startsWith('wwcusername')).length)) {
            //Initialize new user values
            socket.emit('add user');
        }
        else {
            //pull cookie values and indicate to server we have a returning user
            let nameCookie = document.cookie.replace(/(?:(?:^|.*;\s*)wwcusername\s*\=\s*([^;]*).*$)|^.*$/, "$1");
            let colorCookie = document.cookie.replace(/(?:(?:^|.*;\s*)wwcusercolor\s*\=\s*([^;]*).*$)|^.*$/, "$1");
            let data = {username: nameCookie, usercolor: colorCookie};
            socket.emit('add user', data);
        }
    };

    //init userName for session and allow log messages to be broadcast
    setUsername();

    //customize message visuals
    const addChatMessage = (data) => {
        //timestamp in 24 hr format
        var now = new Date();
        var $timestampDiv = $('<span class=timestamp/>')
            .text(now.toLocaleTimeString('en-us', {hour12: false}) + " ");

        //pull cookie values
        let nameCookie = document.cookie.replace(/(?:(?:^|.*;\s*)wwcusername\s*\=\s*([^;]*).*$)|^.*$/, "$1");
        let colorCookie = document.cookie.replace(/(?:(?:^|.*;\s*)wwcusercolor\s*\=\s*([^;]*).*$)|^.*$/, "$1");

        //change username color
        var $usernameDiv = $('<span class="username"/>')
            .text(data.username)
            .css('color', getUsernameColor(data));

        //set message body in div
        var $messageBodyDiv = $('<span class="messageBody">')
            .text(": " + data.message);

        //if message's username is the cookie username, this message is sent from this client
        //bold to indicate this is your message
        if (data.username === nameCookie) {
            $timestampDiv.css('fontWeight', 'bolder');
            $usernameDiv.css('fontWeight', 'bolder');
            $messageBodyDiv.css('fontWeight', 'bolder');
        }

        //append username to timestamp
        var $messageDiv = $('<li class="message"/>')
            .data('username', data.username)
            .append($timestampDiv, $usernameDiv);

        //concat timestamp/username and message contents
        $messageDiv.data('username', data.username)
            .append($messageDiv, $messageBodyDiv);

        //add message to list
        appendToChat($messageDiv);
        socket.emit('append list', $messageDiv.text());
    };

    //append chat message to messages list
    const appendToChat = (el) => {
        var $el = $(el);
        $('#messages').append($el);
        $('#messages').scrollTop($('#messages')[0].scrollHeight);
    };

    // Log a message
    const log = (message) => {
        var $el = $('<li>').addClass('log').text(message);
        appendToChat($el);
    }

    // Gets the color of a username through our hash function
    const getUsernameColor = (data) => {
        // Compute hash code
        var hash = 7;
        //check if usercolor has not been assigned or chosen
        //choose from colors array after hashing username
        if (data.usercolor < 0) {
            for (var i = 0; i < data.username.length; i++) {
                hash = data.username.charCodeAt(i) + (hash << 5) - hash;
            }
            // Calculate color
            var index = Math.abs(hash % COLORS.length);
            socket.emit('update color', COLORS[index], function (responseData) {});
            //assign manually while updated on server-side
            data.usercolor = "#" + COLORS[index];
        }

        //otherwise return user's color value
        return data.usercolor;
    };

    //method to load chat log prior to user joining
    socket.on('load prev', (list) => {
        list.forEach(function(item, index, list) {
            log(item);
        });
    });

    // Whenever the server emits 'login', log the login message
    // write cookies based on user's chosen or assigned values
    socket.on('login', (data) => {
        document.cookie = "wwcusername=" + data.username;
        document.cookie = "wwcusercolor=" + data.usercolor;
        $('#userHeader').text("You are user " + data.username + ".");
        data.usercolor = getUsernameColor(data);
        // Display the welcome message
        var message = "Welcome to Walter's Web Chat";
        log(message);

        //inform the user of who they are in the chat
        message = "You are user " + data.username + ".";
        log(message);
        usersConnectedMessage(data);
    });

    //when enter is hit, check value of input
    $('form').submit(function(){
        let input = $('#inputMessage').val();
        //nickcolor 'command'
        if (input.startsWith("/nickcolor ")) {
            var newColor = input.split(' ')[1];
            socket.emit('update color', newColor, function(responseData) {
                //success response, log to user operation was completed
               if (responseData === true) {
                   var message = "Nickname color successfully updated to #" + newColor + ".";
                   document.cookie = "wwcusercolor=#" + newColor;
                   log(message);
               }
               //nickcolor change failed
               else {
                   var message = "Uh-oh. Value #" + newColor + " is not a valid color value. Example: /nickcolor #ffffff";
                   log(message);
               }
            });
        }
        //nickname 'command'
        else if (input.startsWith("/nick ")) {
            var newNick = input.split(' ')[1];
            //username limit at 26 chars for presentation purposes
            if (newNick.length <= 26) {
                socket.emit('update name', newNick, function(responseData) {
                    //success response, log to user operation was completed
                    if (responseData === true) {
                        var message = "Your username has been successfully changed to " + newNick + ".";
                        $('#userHeader').text("You are user " + newNick + ".");
                        document.cookie = "wwcusername=" + newNick;
                        log(message);
                    }
                    //nickname change failed
                    else {
                        var message = "Unable to update username, '" + newNick + "' is currently in use.";
                        log(message);
                    }
                });
            }
            //nickname too long
            else {
                var message = "Unable to update username. Maximum nickname length is 26 characters.";
                log(message);
            }

        }
        //must be regular message, send
        else {
            socket.emit('new message', input);
        }

        //reset input form value
        $('#inputMessage').val('');
        return false;
    });

    socket.on('log to user', (messageLog) => {
        log(messageLog);
    });

    //log in chat that user has left
    socket.on('user left', (data) => {
        log(data.username + ' left');
    });

    //user disconnected
    socket.on('disconnect', () => {
        log('you have been disconnected');
    });

    //user reconnected
    socket.on('reconnect', () => {
        log('you have been reconnected');
        setUsername();
        if (socket.username) {
            socket.emit('add user', socket.username);
        }
    });

    //unable to reconnect user
    socket.on('reconnect_error', () => {
        log('attempt to reconnect has failed');
    });

});