$(function() {
    var FADE_TIME = 150; // ms
    var TYPING_TIMER_LENGTH = 400; // ms
    var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ];

    // Initialize variables
    var $window = $(window);
    // Input for username
    var $usernameInput = $('.usernameInput');
    //Input for department 
    var $departmentInput = $('.departmentInput'); 
    var $messages = $('.messages'); // Messages area
    var $inputMessage = $('.inputMessage'); // Input message input box

    var $loginPage = $('.login.page'); // The login page
    var $chatPage = $('.chat.page'); // The chatroom page

    // Prompt for setting a username
    var username;
    var department;
    var connected = false;
    var typing = false;
    var lastTypingTime;
    var $currentInput = $usernameInput.focus();
    var currentUser;

    var socket = io();

    const addParticipantsMessage = (data) => {
    var message = '';
    if (data.numUsers === 1) {
        message += "1 Online User";
    } else {
        message += data.numUsers + " Online Users";
    }
    log(message);
    }
    //convert department
    const convertDepartment = (dpt) => {
        switch(dpt) {
            case "marketing":
                department = "(mkg)"
                break;
            case "operations-management":
                department = "(OP)"
                break;
            case "human-resource":
                department = "(HR)"
                break;
            case "it":
                department = "(IT)"
        }
    }
    // client's username
    const setUsername = () => {
    username = cleanInput($usernameInput.val().trim());
    department = cleanInput($departmentInput.val().trim());
    convertDepartment(department)
    // If the username is valid
    if (username && department) {
        $loginPage.fadeOut();
        $chatPage.show();
        $loginPage.off('click');
        $currentInput = $inputMessage.focus();

    // Tell the server your username
    currentUser = username;
    socket.emit('add user', username, department, currentUser);
    }else{
        location .reload()
    }
    }
    

    // Sends a chat message
    const sendMessage = () => {
    var message = $inputMessage.val();
    message = cleanInput(message);
    if (message && connected) {
        $inputMessage.val('');
        addChatMessage({
        username: username,
        department : department,
        message: message
        });
    //  execute 'new message'
        socket.emit('new message', message);
    }
    }

    // Log a message
    const log = (message, options) => {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
    }

    // Adds the visual chat message to the message list
    const addChatMessage = (data, options) => {
    //avoid fade in 
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
        options.fade = false;
        $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
        .text(data.username + " " + data.department + ":")
        .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
        .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    if (data.username === currentUser){
        var $messageDiv = $('<li class="message"/>')
        .data('username', data.username)
        .addClass(typingClass)
        .append($usernameDiv, $messageBodyDiv);
    } else {
        var $messageDiv = $('<li class="message-others"/>')
        .data('username', data.username)
        .addClass(typingClass)
        .append($usernameDiv, $messageBodyDiv);
    }

    addMessageElement($messageDiv, options);
    }
    

    // Adds the visual chat typing message
    const addChatTyping = (data) => {
    data.typing = true;
    data.message = 'is typing...';
    addChatMessage(data);
    }

    // Removes the visual chat typing message
    const removeChatTyping = (data) => {
    getTypingMessages(data).fadeOut(function () {
        $(this).remove();
    });
    }

    // Adds a message element to the messages and scrolls to the bottom

    const addMessageElement = (el, options) => {
    var $el = $(el);

    // Setup default options
    if (!options) {
        options = {};
    }
    if (typeof options.fade === 'undefined') {
        options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
        options.prepend = false;
    }

    // Apply options
    if (options.fade) {
        $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
        $messages.prepend($el);
    } else {
        $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;//scroll on top
    }

    // Prevents input from having injected markup
    const cleanInput = (input) => {
    return $('<div/>').text(input).html();
    }

    // Updates the typing event
    const updateTyping = () => {
    if (connected) {
        if (!typing) {
        typing = true;
        socket.emit('typing');
        }
        lastTypingTime = (new Date()).getTime();

        setTimeout(() => {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
            socket.emit('stop typing');
            typing = false;
        }
        }, TYPING_TIMER_LENGTH);
    }
    }

    // X is typing
    const getTypingMessages = (data) => {
        if (data.username === currentUser){
            return $('.typing.message').filter(function (i) {
                return $(this).data('username') === data.username;
            });
        } else {
            return $('.typing.message-others').filter(function (i) {
                return $(this).data('username') === data.username;
            });
        }

    }

    //  hash function to get color of username
    const getUsernameColor = (username) => {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
    }

    // Keyboard events

    $window.keydown(event => {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
        $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
        if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
        } else {
        setUsername();
        }
    }
    });

    $inputMessage.on('input', () => {
    updateTyping();
    });


    // Socket events

    //  the server emits 'login' - log the login message
    socket.on('login', (data) => {
    connected = true;
    // Display the welcome message
    var message = "Welcome to Company.io";
    log(message, {
        prepend: true
    });
    addParticipantsMessage(data);
    });

    // server emits 'new message' - update the chat body
    socket.on('new message', (data) => {
    addChatMessage(data);
    });

    // the server emits 'user joined'-log it in the chat body
    socket.on('user joined', (data) => {
    log(data.username + data.department + ' joined');
    addParticipantsMessage(data);
    });

    //  server emits 'user left'- log it in the chat body
    socket.on('user left', (data) => {
    log(data.username + data.department + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);
    });

    //server  emits 'typing'- show the typing message
    socket.on('typing', (data) => {
    addChatTyping(data);
    });

    // server emits 'stop typing' - kill the typing message
    socket.on('stop typing', (data) => {
    removeChatTyping(data);
    });
    //disconnet and riconnect
    socket.on('disconnect', () => {
    log('you have been disconnected');
    });

    socket.on('reconnect', () => {
    log('you have been reconnected');
    if (username) {
        socket.emit('add user', username);
    }
    });

});