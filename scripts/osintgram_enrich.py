"""
Instagram enrichment using Instagram's web API with session cookie auth.

Fetches rich profile data: public email, city, phone, HD profile pic,
business category, verification status, and recent posts with engagement.

Usage:
    python scripts/osintgram_enrich.py <target_handle>

Auth: INSTAGRAM_SESSIONID env var (browser session cookie)
"""

import os
import sys
import json
from urllib.parse import unquote

import requests


WEB_APP_ID = "936619743392459"
BASE_URL = "https://www.instagram.com"


def create_session():
    session_id = os.environ.get("INSTAGRAM_SESSIONID")
    if not session_id:
        return None

    decoded = unquote(session_id)

    s = requests.Session()
    s.cookies.set("sessionid", decoded, domain=".instagram.com")
    s.max_redirects = 5
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "X-IG-App-ID": WEB_APP_ID,
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRFToken": "missing",
        "Referer": BASE_URL + "/",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
    })
    return s


def fetch_profile(session, username):
    url = f"{BASE_URL}/api/v1/users/web_profile_info/"
    params = {"username": username}

    try:
        resp = session.get(url, params=params, timeout=10)
        if resp.status_code == 429:
            import time
            time.sleep(3)
            resp = session.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else 0
        if status == 404:
            return None
        print(json.dumps({"error": f"HTTP {status} from Instagram API"}), file=sys.stderr)
        return None
    except Exception as e:
        print(json.dumps({"error": f"Request failed: {str(e)[:200]}"}), file=sys.stderr)
        return None

    user = data.get("data", {}).get("user")
    if not user:
        return None

    result = {
        "user_id": user.get("id", ""),
        "full_name": user.get("full_name", ""),
        "biography": user.get("biography", ""),
        "followers": user.get("edge_followed_by", {}).get("count", 0),
        "following": user.get("edge_follow", {}).get("count", 0),
        "media_count": user.get("edge_owner_to_timeline_media", {}).get("count", 0),
        "is_private": user.get("is_private", False),
        "is_verified": user.get("is_verified", False),
        "is_business": user.get("is_business_account", False),
        "category": user.get("business_category_name") or user.get("category_name") or "",
        "external_url": user.get("external_url") or "",
        "profile_pic_url": user.get("profile_pic_url_hd") or user.get("profile_pic_url") or "",
        "public_email": user.get("business_email") or "",
        "contact_phone_number": str(user.get("business_phone_number") or ""),
        "whatsapp_number": "",
        "city_name": "",
        "address_street": "",
    }

    biz_addr = user.get("business_address_json")
    if biz_addr:
        try:
            addr = json.loads(biz_addr) if isinstance(biz_addr, str) else biz_addr
            result["city_name"] = addr.get("city_name", "")
            result["address_street"] = addr.get("street_address", "")
        except (json.JSONDecodeError, TypeError):
            pass

    posts = []
    timeline = user.get("edge_owner_to_timeline_media", {})
    for edge in timeline.get("edges", [])[:5]:
        node = edge.get("node", {})
        typename = node.get("__typename", "")
        if "Video" in typename:
            media_type = "Video"
        elif "Sidecar" in typename:
            media_type = "Carousel"
        else:
            media_type = "Photo"

        caption_edges = node.get("edge_media_to_caption", {}).get("edges", [])
        caption = caption_edges[0]["node"]["text"][:500] if caption_edges else ""

        post = {
            "type": media_type,
            "likes": node.get("edge_liked_by", {}).get("count", 0) or node.get("edge_media_preview_like", {}).get("count", 0),
            "comments": node.get("edge_media_to_comment", {}).get("count", 0),
            "views": node.get("video_view_count", 0),
            "text": caption,
            "url": f"https://www.instagram.com/p/{node.get('shortcode', '')}/",
        }
        posts.append(post)

    result["recent_posts"] = posts
    return result


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No target username provided"}))
        sys.exit(1)

    target = sys.argv[1].strip().lstrip("@")

    session = create_session()
    if session is None:
        print(json.dumps({"error": "INSTAGRAM_SESSIONID not set"}))
        sys.exit(1)

    info = fetch_profile(session, target)
    if info is None:
        print(json.dumps({"error": f"Failed to fetch profile for {target}"}))
        sys.exit(1)

    print(json.dumps(info, ensure_ascii=False))


if __name__ == "__main__":
    main()
