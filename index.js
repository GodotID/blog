const crypto = require('crypto');
const fs = require('fs');
const md = require('markdown-it')();

const package = require('./package.json');

const { Deta } = require('deta');
const express = require('express')

const deta = Deta(process.env.DETATOKEN || "");
const articles = deta.Base('articles');
const users = deta.Base('users');
const app = express();

app.use(express.urlencoded({ extended: true }))
app.use(express.json());
// TODO: Add express centralized error handling
app.use((req, res, next) => {
	res.error = (code, msg) => {
		res.json({
			error: true,
			msg: msg
		});
		res.status(code).end();
	};

	res.success = (data, msg='') => {
		res.json({
			error: false,
			data: data,
			msg: msg
		});
		res.status(200).end();
	};

	next();
});

// TODO: Refactor these endpoints into their own file, use a factory i guess.
app.get('/', (req, res) => res.send(`GodotID Blog API ${package.version}`));

app.post('/register', async (req, res) => {
	// TODO: Verify user email
	// WARN: TODO: Validate req.body user input
	let rd = new Author(req.body.username, req.body.password, req.body.email);
	let user = null;

	try {
		user = await users.insert(rd, rd.hash);
	} catch (e) {
		// XXX: We should provide clear detail as to why this fails
		return res.error(400, "User already exists");
	}

	return res.json({
		name: rd.name,
		hash: rd.hash
	});
});

app.post('/login', async (req, res) => {
	// WARN: TODO: Validate req.body user input
	let hash = crypto.createHash('sha256')
		   .update(req.body.username + req.body.password)
		   .digest('hex');
	let user = await users.get(hash);
	if (!user) {
		return res.error(403, 'Username or password mismatch.');
	}

	return res.success(null);
});

app.get('/user/:key', async (req, res) => {
	// WARN: TODO: Validate req.body user input
	let user = await users.get(req.params.key);

	if (user === null) {
		return res.error(404, "User not found");
	}

	user.password = 'REDACTED';

	return res.json(user);
});

app.post('/submit', async (req, res) => {
	// WARN: TODO: Validate req.body user input
	let user = await users.get(req.body.userhash);
	if (!user) {
		return res.error(403, 'Please login before submitting post.');
	}

	let article = new Article(req.body.title, req.body.content, user.name, user.key);
	await articles.put(article);
	res.location(`https://blog.godot.id/${article.key}`);
	res.status(302).end();
});

app.get('/article/:article', async (req, res) => {
	let article = await articles.get(req.params.article);
	if (!article) {
		return res.error(404, 'Article did not exists');
	}
	let { content, title } = article;

	content = md.render(`# ${title}\n${content}`);
	return res.success({
		author: article.author,
		rendered: content
	});
});

function normalizeTitle(title) {
	return title.replace(/\s/g, '-').replace(/[^a-z0-9\-]/ig, '').toLowerCase();
}

class Author {
	constructor(name, password, email, bio, profilePicture) {
		this.name = name;
		// TODO: Omit password, use hash instead.
		this.password = password;
		this.email = email;
		this.hash = crypto.createHash('sha256')
			    .update(name + password)
			    .digest('hex');
		this.bio = bio;
		this.profilePicture = profilePicture;
	}
}

class Article {
	constructor(title, content, author, authorHash) {
		const noncestr = String(Date.now());

		let hash = crypto.createHash('sha256')
			   .update(title + content + author + noncestr)
			   .digest('hex').substring(0, 8);
		this.key = `${normalizeTitle(title)}-${hash}`;
		this.title = title;
		this.content = content;
		this.author = author;
		this.authorHash = authorHash;
		this.creationDate = noncestr;
	}
}

if (!process.env.DETA_RUNTIME) {
	app.listen(8080, async () => {
		console.log("Ran at 8080");
	});
} else {
	module.exports = app;
}
