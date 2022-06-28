const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('port', process.env.PORT || 3002);

class Users {
    constructor() {
        this.list = [];
        if(!fs.existsSync('./users.json')) {
            fs.writeFileSync('./users.json', '[]');
            this.list = []
        } else {
            this.list = JSON.parse(fs.readFileSync('./users.json', 'utf8'));
        }
    }

    save() {
        fs.writeFileSync('./users.json', JSON.stringify(this.list, null, 2));
    }

    get(email) {
        return this.list.find(u => u.email === email);
    }

    add(user) {
        if (this.list.find(u => u.email === user.email)) {
            throw new Error('User already exists');
        }
        user.id = this.list.length;
        user.jwt = jwt.sign({ email: user.email }, process.env.SECRET);
        this.list.push(user);
        fs.writeFileSync('./users.json', JSON.stringify(this.list));
    }
}

function authenticate(req, res, next) {
    const token = req.cookies.token || '';
    try {
        const decoded = jwt.verify(token, process.env.SECRET);
        res.locals.user = decoded;  
        res.locals.authenticated = true;
        next();
    } catch (e) {
        res.locals.authenticated = false;
        next();
    }
}

app.get('/', authenticate, (req, res) => {
    if(res.locals.authenticated) {
        res.send('Hello ' + res.locals.user.email);
    } else {
        res.redirect('/login');
    }
});

app.use('/validate', authenticate, (req, res) => {
    if(res.locals.authenticated) {
        res.status(200).send('OK');
    } else {
        res.clearCookie('token');
        res.status(401).send('Unauthorized');
    }
});

app.get('/login', (req, res) => {
    const redirectURL = req.query.redirectURL
    const hiddenField = redirectURL ? `<input type="hidden" id="redirectURL" name="redirectURL" value="${redirectURL}">` : ""
    return res.send(`
        <h1>Login</h1>
        <form action="/login" method="POST">
            <label for="email">Email</label>
            <input type="text" id="email" name="email" placeholder="email">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" placeholder="Password">
            ${hiddenField}
            <input type="submit" value="Login">
        </form>
    `)
})

app.post('/login', (req, res) => {
    const users = new Users();
    const user = users.get(req.body.email) || {};
    const redirectUrl = req.body.redirectURL || '/';
    if(req.body.email === user.email && req.body.password === user.password) {
        res.cookie('token', user.jwt, {
            httpOnly: true,
            domain: process.env.DOMAIN,
            expires: new Date(Date.now() + 30*24*60*60*1000),
          });
        return res.redirect(redirectUrl);
    }
    return res.redirect('/login');
})

// error handler
app.use((err, req, res, next) => {
  res.status(400).send(err.message)
})

app.listen(app.get('port'), () => {
    console.log(`Find the server at: http://localhost:${app.get('port')}/`);
  });