import os, secrets
from datetime import datetime, timezone
from flask import render_template, g, jsonify, request
from core import db, User, make_app, login_required, owned, payload, text, Invalid
from werkzeug.security import generate_password_hash


class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    author = db.relationship(User)
    title = db.Column(db.String(140), nullable=False)
    body = db.Column(db.Text, nullable=False)
    topic = db.Column(db.String(20), default="General")
    published = db.Column(db.Boolean, default=False)
    created = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def public(self):
        return dict(
            id=self.id,
            title=self.title,
            body=self.body,
            topic=self.topic,
            published=self.published,
            created=self.created.isoformat(),
            author=self.author.name,
            owner_id=self.user_id,
        )


class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("post.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    author = db.relationship(User)
    body = db.Column(db.String(2000), nullable=False)
    created = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def public(self):
        return dict(
            id=self.id,
            body=self.body,
            author=self.author.name,
            owner_id=self.user_id,
            created=self.created.isoformat(),
        )


def fields(d):
    values = dict(title=text(d, "title", 140), body=text(d, "body", 30000))
    if d.get("topic", "General") not in [
        "General",
        "Design",
        "Development",
        "Everyday",
    ]:
        raise Invalid("Choose a valid topic.")
    if not isinstance(d.get("published", False), bool):
        raise Invalid("Published must be true or false.")
    values.update(topic=d.get("topic", "General"), published=d.get("published", False))
    return values


def create_app(config=None):
    app = make_app(__name__, config)
    app.config["SESSION_COOKIE_NAME"] = "journal_session"

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.get("/read/<int:item_id>")
    def reader(item_id):
        return render_template("read.html", post_id=item_id)

    @app.get("/write")
    def editor():
        return render_template("write.html")

    @app.get("/api/posts")
    def posts():
        mine = request.args.get("mine") == "1"
        if mine and not g.user:
            raise Invalid("Sign in to see your posts.", 401)
        q = (
            db.select(Post).where(Post.user_id == g.user.id)
            if mine
            else db.select(Post).where(Post.published.is_(True))
        )
        return jsonify(
            [p.public() for p in db.session.scalars(q.order_by(Post.created.desc()))]
        )

    @app.get("/api/posts/<int:item_id>")
    def read(item_id):
        p = db.session.get(Post, item_id)
        if not p or (not p.published and (not g.user or p.user_id != g.user.id)):
            raise Invalid("Post not found.", 404)
        comments = db.session.scalars(
            db.select(Comment).where(Comment.post_id == p.id).order_by(Comment.created)
        )
        return jsonify(post=p.public(), comments=[c.public() for c in comments])

    @app.post("/api/posts")
    @login_required
    def create():
        p = Post(user_id=g.user.id, **fields(payload()))
        db.session.add(p)
        db.session.commit()
        return jsonify(p.public()), 201

    @app.put("/api/posts/<int:item_id>")
    @login_required
    def update(item_id):
        p = owned(Post, item_id)
        for k, v in fields(payload()).items():
            setattr(p, k, v)
        db.session.commit()
        return jsonify(p.public())

    @app.delete("/api/posts/<int:item_id>")
    @login_required
    def delete(item_id):
        p = owned(Post, item_id)
        db.session.execute(db.delete(Comment).where(Comment.post_id == p.id))
        db.session.delete(p)
        db.session.commit()
        return {"ok": True}

    @app.post("/api/posts/<int:item_id>/comments")
    @login_required
    def comment(item_id):
        p = db.session.get(Post, item_id)
        if not p or not p.published:
            raise Invalid("Published post not found.", 404)
        c = Comment(post_id=p.id, user_id=g.user.id, body=text(payload(), "body", 2000))
        db.session.add(c)
        db.session.commit()
        return jsonify(c.public()), 201

    @app.delete("/api/comments/<int:item_id>")
    @login_required
    def remove_comment(item_id):
        db.session.delete(owned(Comment, item_id))
        db.session.commit()
        return {"ok": True}

    @app.cli.command("seed")
    def seed():
        user = db.session.scalar(
            db.select(User).where(User.email == "editor@example.com")
        )
        if not user:
            user = User(
                name="Editorial team",
                email="editor@example.com",
                password_hash=generate_password_hash(secrets.token_urlsafe(40)),
            )
            db.session.add(user)
            db.session.flush()
        entries = [
            (
                "Making a little more room",
                "Design",
                "The most useful part of a room is often the space between things. It gives us somewhere to move, somewhere to pause, and a way to understand what matters.\n\nThe same is true of an interface. A little more space can make a label easier to find or a decision easier to make. It gives each part a clear relationship to the next.\n\nStart by taking one thing away. Look again. Notice whether the experience has become clearer. This is a demonstration article for the publishing application.",
            ),
            (
                "A smaller first version",
                "Development",
                "When beginning a project, it helps to write down the smallest useful version. Not the full roadmap. Just the first thing a person should be able to do.\n\nBuild that path all the way through. Give it real data, an understandable error state and a way to begin again. Then let what you learn shape the next step.\n\nThis sample post is included to demonstrate the reading and comment experience.",
            ),
            (
                "Keeping an everyday notebook",
                "Everyday",
                "A notebook does not need a system to be useful. It can hold a shopping list, a sentence from a conversation or a rough idea that is not quite ready.\n\nThe habit is simply to return to it. A few lines at the end of the day are enough. Over time, small observations begin to form a record.\n\nThis is a sample entry. Create an account to publish your own writing.",
            ),
        ]
        for title, topic, body in entries:
            if not db.session.scalar(
                db.select(Post.id).where(Post.title == title, Post.user_id == user.id)
            ):
                db.session.add(
                    Post(
                        user_id=user.id,
                        title=title,
                        topic=topic,
                        body=body,
                        published=True,
                    )
                )
        db.session.commit()
        print("Sample articles added without replacing existing posts.")

    with app.app_context():
        db.create_all()
    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=int(os.getenv("PORT", 3200)))
