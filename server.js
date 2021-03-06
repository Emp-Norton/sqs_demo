// Require objects.
var express  = require('express');
var app      = express();
var aws      = require('aws-sdk');
var queueUrl = "https://sqs.us-west-1.amazonaws.com/276347759228/";
var currentQueue = "";
var messageHistory = {};
var currentMessages = [];
    
// Load your AWS credentials and try to instantiate the object.
aws.config.loadFromPath(__dirname + '/config.json');

// Instantiate SQS.
var sqs = new aws.SQS();

// Creating a queue.


app.get('/create/:name', function (req, res) {
    var params = {
        QueueName:  req.params.name
    };
    
    sqs.createQueue(params, function(err, data) {
        if(err) {
            res.send(err);
        } 
        else {
	console.log(data.QueueUrl)
            res.send(data);
        } 
    });
});

// Listing our queues.
app.get('/list', function (req, res) {
    sqs.listQueues(function(err, data) {
        if(err) {
            res.send(err);
        } 
        else {
            res.send(data);
        } 
    });
});

// Sending a message.
// NOTE: Here we need to populate the queue url you want to send to.
// That variable is indicated at the top of app.js.
app.get('/send/:queue/:message', function (req, res) {
    var params = {
        MessageBody: req.params.message,
        QueueUrl: queueUrl + req.params.queue, 
        DelaySeconds: 0
    };

    sqs.sendMessage(params, function(err, data) {
        if(err) {
            res.send(err);
        } 
        else {
            res.send(data);
        } 
    });
});

// Receive a message.
// NOTE: This is a great long polling example. You would want to perform
// this action on some sort of job server so that you can process these
// records. In this example I'm just showing you how to make the call.
// It will then put the message "in flight" and I won't be able to 
// reach that message again until that visibility timeout is done.
app.get('/receive/:queue', function (req, res) {
	currentQueue = req.params.queue;
    var params = {
        QueueUrl: queueUrl + req.params.queue,
        VisibilityTimeout: 600 // 10 min wait time for anyone else to process.
    };
	    
    sqs.receiveMessage(params, function(err, data) {
        if(err) {
            res.send(err);
        } 
        else {
	  var receipt = data.Messages[0].ReceiptHandle
	  var id = data.Messages[0].MessageId
	  messageHistory[id] = receipt;
	 currentQueue = req.params.queue;
	 currentMessages.push(id); 
	console.log(currentMessages);
	console.log(messageHistory);
            res.send(data);
        } 
    });

});

// Deleting a message.
app.get('/delete', function (req, res) {
	 var params = {
        QueueUrl: queueUrl + currentQueue,
        ReceiptHandle: messageHistory[currentMessages[currentMessages.length - 1]]
    };
	console.log(params)    
    sqs.deleteMessage(params, function(err, data) {
        if(err) {
            res.send(err);
        } 
        else {
    	console.log('deleting message ')
	currentMessages.pop();
	console.log(currentMessages)
	console.log(messageHistory)
            res.send(data);
        } 
    });
});

// Purging the entire queue.
app.get('/purge', function (req, res) {
    var params = {
        QueueUrl: queueUrl
    };
    
    sqs.purgeQueue(params, function(err, data) {
        if(err) {
            res.send(err);
        } 
        else {
            res.send(data);
        } 
    });
});

// Start server.
var server = app.listen(80, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('AWS SQS example app listening at http://%s:%s', host, port);
});
