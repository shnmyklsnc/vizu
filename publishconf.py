# Settings used only for the production build (GitHub Actions -> Pages).
# Local dev uses pelicanconf.py directly instead.
import sys
import os

sys.path.append(os.path.dirname(__file__))
from pelicanconf import *  # noqa

SITEURL = "https://shnmyklsnc.github.io/vizu"
RELATIVE_URLS = False

FEED_ALL_ATOM = None
CATEGORY_FEED_ATOM = None

DELETE_OUTPUT_DIRECTORY = True
