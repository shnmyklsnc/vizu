import json

AUTHOR = "Shan"
SITENAME = "Vizu"
SITESUBTITLE = "A gallery of generative animations and visualizations"
SITEURL = ""

PATH = "content"
TIMEZONE = "Asia/Taipei"
DEFAULT_LANG = "en"

THEME = "theme"

STATIC_PATHS = ["extra"]

# Keep the same /sketches/<slug>/ URL shape the old Jekyll site used.
ARTICLE_URL = "sketches/{slug}/"
ARTICLE_SAVE_AS = "sketches/{slug}/index.html"

PAGE_PATHS = ["pages"]

DEFAULT_PAGINATION = False
DEFAULT_DATE_FORMAT = "%B %-d, %Y"

# This is a sketchbook, not a blog: no feeds, and no tag/category/author
# archive pages (we don't have a template styled for them, and nothing
# in the site links to them).
FEED_ALL_ATOM = None
CATEGORY_FEED_ATOM = None
TRANSLATION_FEED_ATOM = None
AUTHOR_FEED_ATOM = None
AUTHOR_FEED_RSS = None

DIRECT_TEMPLATES = ["index"]
TAG_SAVE_AS = ""
TAGS_SAVE_AS = ""
CATEGORY_SAVE_AS = ""
CATEGORIES_SAVE_AS = ""
AUTHOR_SAVE_AS = ""
AUTHORS_SAVE_AS = ""
ARCHIVES_SAVE_AS = ""

# We don't generate separate category/tag archive pages (no template styled
# for them) -- category and tag browsing instead happens client-side on the
# homepage (see theme/templates/base.html + extra/js/nav.js), reading the
# `categories` / `tags` / `articles` context Pelican already builds.
DEFAULT_CATEGORY = "Misc"

# Lets templates safely embed Python values as JSON (used to build the
# in-page search index -- see the #search-data block in base.html).
JINJA_FILTERS = {"tojson": json.dumps}

DEFAULT_METADATA = {
    "status": "published",
}
