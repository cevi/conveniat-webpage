from flask import Flask, render_template, request, redirect, jsonify

app = Flask(__name__)

# Fake users in HitobitoProfile format
FAKE_USERS = [
    {
        "id": "1",
        "email": "admin@conveniat27.ch",
        "first_name": "Admin",
        "last_name": "Conveniat",
        "nickname": "Letmein",
        "roles": [
            {"group_id": 541, "group_name": "Admins", "role_name": "Admin", "role_class": "admin"},
            {"group_id": 102, "group_name": "Editors", "role_name": "Editor", "role_class": "editor"}
        ],
        "comment": "Dieser Benutzer hat Admin-Zugriff auf das conveniat27.ch-Backend."
    },
    {
        "id": "2",
        "email": "benutzer2@conveniat27.ch",
        "first_name": "Benutzer Nr. 2",
        "last_name": "Conveniat",
        "nickname": "NoAccess",
        "roles": [
            {"group_id": 102, "group_name": "Editors", "role_name": "Editor", "role_class": "editor"}
        ],
        "comment": "Dieser Benutzer hat aktuell keinen Zugriff auf das conveniat27.ch-Backend."
    },
    {
        "id": "3",
        "email": "benutzer3@conveniat27.ch",
        "first_name": "Benutzer Nr. 3",
        "last_name": "Conveniat",
        "nickname": "NoAccess",
        "roles": [
            {"group_id": 102, "group_name": "Editors", "role_name": "Editor", "role_class": "editor"}
        ],
        "comment": "Dieser Benutzer hat aktuell keinen Zugriff auf das conveniat27.ch-Backend."
    },
]

# Store issued tokens
ACTIVE_TOKENS = {}

@app.route("/")
def home():
    """Homepage with a fake login screen"""
    return render_template("login.html", users=FAKE_USERS)

@app.route("/oauth/authorize")
def authorize():
    """OAuth2 Authorization Endpoint - User selects an account"""
    client_id = request.args.get("client_id")
    redirect_uri = request.args.get("redirect_uri")

    return render_template("login.html", users=FAKE_USERS, redirect_uri=redirect_uri)

@app.route("/login", methods=["POST"])
def login():
    """Handles login and redirects to the given redirect_uri with a fake code"""
    user_id = request.form.get("user_id")
    redirect_uri = request.form.get("redirect_uri")

    user = next((u for u in FAKE_USERS if u["id"] == user_id), None)
    if not user:
        return "User not found", 400

    fake_auth_code = f"fake-auth-code-{user['id']}"
    return redirect(f"{redirect_uri}?code={fake_auth_code}")

@app.route("/oauth/token", methods=["POST"])
def token():
    """OAuth2 Token Exchange - Returns a fake access token"""
    grant_type = request.form.get("grant_type")

    if grant_type == "refresh_token":
        refresh_token = request.form.get("refresh_token")
        if not refresh_token:
             return jsonify({"error": "invalid_request", "error_description": "Missing refresh token"}), 400
        
        # Simple extraction
        user_id = refresh_token.replace("fake-refresh-token-", "")
        user = next((u for u in FAKE_USERS if u["id"] == user_id), None)
        if not user:
            return jsonify({"error": "invalid_grant", "error_description": "Invalid refresh token user"}), 400
            
        access_token = f"fake-token-{user['id']}"
        ACTIVE_TOKENS[access_token] = user
        
        return jsonify({
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 3600,
            "refresh_token": refresh_token 
        })

    auth_code = request.form.get("code")
    if not auth_code:
        return jsonify({"error": "invalid_request", "error_description": "Missing authorization code"}), 400

    # Extract user ID from fake auth code
    try:
        user_id = auth_code.replace("fake-auth-code-", "")
    except ValueError:
        return jsonify({"error": "invalid_request", "error_description": "Invalid authorization code"}), 400

    user = next((u for u in FAKE_USERS if u["id"] == user_id), None)
    if not user:
        return jsonify({"error": "invalid_grant", "error_description": "Invalid user"}), 400

    # Generate a fake access token and store it
    access_token = f"fake-token-{user['id']}"
    ACTIVE_TOKENS[access_token] = user
    
    refresh_token = f"fake-refresh-token-{user['id']}"

    # Simulate OAuth2 token response
    response = {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 3600,
        "refresh_token": refresh_token
    }
    return jsonify(response)

@app.route("/oauth/profile", methods=["GET"])
def profile():
    """Returns the user profile based on the access token"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid authorization header"}), 401

    access_token = auth_header.split(" ")[1]
    user = ACTIVE_TOKENS.get(access_token)

    if not user:
        return jsonify({"error": "Invalid or expired token"}), 401

    return jsonify(user)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
