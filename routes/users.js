var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res) {
  res.send('respond with a resource');
});


router.get('/video', function(req, res) {
    res.render('video');
});

router.get('/simplewebrtctest', function(req, res) {
    res.render('simplewebrtctest');
});

router.get('/chat', function(req, res) {
    res.render('chat');
});

router.get('/stunclient', function(req, res) {
    res.render('modal');
});

router.get("/test",function(req, res){
    res.render("test")
})
module.exports = router;
