import os
import sys
import json
import instaloader

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No target username provided"}))
        sys.exit(1)
        
    target_username = sys.argv[1]
    
    # Get credentials from environment
    username = os.environ.get('INSTAGRAM_USERNAME')
    password = os.environ.get('INSTAGRAM_PASSWORD')
    
    L = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False
    )
    
    # Perform login if credentials are provided
    if username and password:
        session_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"session_{username}")
        try:
            # Try loading cached session
            L.load_session_from_file(username, filename=session_file)
        except Exception:
            try:
                # Log in and save session cache
                L.login(username, password)
                L.save_session_to_file(filename=session_file)
            except Exception as e:
                print(json.dumps({"error": f"Login failed: {str(e)}"}))
                sys.exit(1)
    else:
        # Attempt anonymous fetch if no credentials provided (unstable but fallback)
        pass

    try:
        profile = instaloader.Profile.from_username(L.context, target_username)
        
        # Build response payload
        data = {
            "profile_pic_url": profile.profile_pic_url,
            "biography": profile.biography,
            "followers": profile.followers,
            "following": profile.followees,
            "external_url": profile.external_url,
            "media_count": profile.mediacount
        }
        print(json.dumps(data))
    except Exception as e:
        print(json.dumps({"error": f"Failed to fetch profile: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
