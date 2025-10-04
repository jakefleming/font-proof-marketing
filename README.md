# Font Proof Marketing Site

A marketing website for Font Proof - Professional font testing for macOS designers and typographers.

## Development

To run locally:

    gem install bundler
    bundle install

... and then finally:

    bundle exec jekyll serve

Then open your browser and hit [http://localhost:5000](http://localhost:5000).

That'll get you a home page and one post.  The rest is all you!  See the [Jekyll docs](https://github.com/mojombo/jekyll/wiki) for details.

To create a new post, just:

    touch _posts/yyyy-mm-dd-url-friendly-title.markdown

... where yyyy-mm-dd is a date (e.g., 2012-08-31) and url-friendly-title is, well, a URL-friendly title.  Then inside that post, be sure to add at least the minimal [YAML front matter](https://github.com/mojombo/jekyll/wiki/YAML-Front-Matter) (see the _posts folder for an example):

    ---
    layout: post
    title: "My Second Post"
    ---

   	It was a dark and stormy night...
