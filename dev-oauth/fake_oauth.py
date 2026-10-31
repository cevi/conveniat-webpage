from urllib.parse import quote

from flask import Flask, render_template, request, redirect, jsonify, send_from_directory
import os
import time

app = Flask(__name__)


def get_env_int(name, fallback):
    """Read a numeric Cevi.DB group id from the environment, with a dev fallback."""
    raw_value = os.environ.get(name)
    if raw_value is None or raw_value == "":
        raw_value = str(fallback)
    try:
        return int(raw_value)
    except (TypeError, ValueError):
        return fallback


SELECTABLE_GROUPS = [
    {
        "id": get_env_int("CEVIDB_GROUP_FULL_ADMIN", 541),
        "group_name": "Full Admin",
        "role_name": "Admin",
        "role_class": "admin",
        "description": "Full admin access in the admin panel and other app areas.",
    },
    {
        "id": get_env_int("CEVIDB_GROUP_WEB_CORE_TEAM", 105),
        "group_name": "Web Core Team",
        "role_name": "Web Core",
        "role_class": "editor",
        "description": "Content and support access for web work.",
    },
    {
        "id": get_env_int("CEVIDB_GROUP_TRANSLATION_TEAM", 106),
        "group_name": "Translation Team",
        "role_name": "Translation Team",
        "role_class": "editor",
        "description": "Translation and editorial content access.",
    },
    {
        "id": get_env_int("CEVIDB_GROUP_PROGRAM_TEAM", 107),
        "group_name": "Program Team",
        "role_name": "Program Team",
        "role_class": "editor",
        "description": "Program-related content access.",
    },
    {
        "id": get_env_int("BILLING_ADMIN_GROUP_ID", 540),
        "group_name": "Billing Team",
        "role_name": "Billing",
        "role_class": "billing",
        "description": "Billing admin access only.",
    },
    {
        "id": get_env_int("CEVIDB_GROUP_MATERIAL_TEAM", 108),
        "group_name": "Material Team",
        "role_name": "Material Team",
        "role_class": "editor",
        "description": "Runs the material depot in the app.",
    },
    {
        "id": get_env_int("CEVIDB_GROUP_HOF_DASHBOARD_REVIEWERS", 109),
        "group_name": "Hof Dashboard Reviewers",
        "role_name": "Hof Dashboard",
        "role_class": "editor",
        "description": "Reviews Hof dashboard submissions without full admin access.",
    },
]


def build_custom_user(first_name, last_name, email, nickname, selected_group_ids):
    """Create a fake user profile from the selected Cevi.DB group IDs."""
    chosen_ids = {int(group_id) for group_id in selected_group_ids if group_id}
    selected_groups = [
        group
        for group in SELECTABLE_GROUPS
        if group["id"] in chosen_ids
    ]

    custom_user_id = next_custom_user_id()
    display_name = (first_name or "Custom").strip() or "Custom"
    family_name = (last_name or "User").strip() or "User"
    base_email = (email or f"{(nickname or display_name).lower().replace(' ', '-')}@conveniat27.ch").strip()
    email_local, email_domain = base_email.rsplit("@", 1) if "@" in base_email else (base_email, "conveniat27.ch")
    unique_email = f"{email_local}+custom-{custom_user_id}@{email_domain}"
    display_nickname = (nickname or f"{display_name} {family_name[:1]}".strip()).strip() or "CustomUser"

    return {
        "id": custom_user_id,
        "email": unique_email,
        "first_name": display_name,
        "last_name": family_name,
        "nickname": display_nickname,
        "roles": [
            {
                "group_id": group["id"],
                "group_name": group["group_name"],
                "role_name": group["role_name"],
                "role_class": group["role_class"],
            }
            for group in selected_groups
        ],
        "comment": (
            "Custom login built in the OAuth tester. "
            f"Selected groups: {', '.join(str(group['id']) for group in selected_groups) if selected_groups else 'None'}"
        ),
    }


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
        "email": "admin2@conveniat27.ch",
        "first_name": "Admin + Billing",
        "last_name": "Conveniat",
        "nickname": "Letmein2",
        "roles": [
            {"group_id": 541, "group_name": "Admins", "role_name": "Admin", "role_class": "admin"},
            {"group_id": 540, "group_name": "Billing", "role_name": "Billing", "role_class": "billing"},
            {"group_id": 102, "group_name": "Editors", "role_name": "Editor", "role_class": "editor"}
        ],
        "comment": "Dieser Benutzer hat Admin-Zugriff und Billing-Zugriff auf das conveniat27.ch-Backend."
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
    {
        "id": "4",
        "email": "benutzer4@conveniat27.ch",
        "first_name": "Benutzer Nr. 4",
        "last_name": "Conveniat",
        "nickname": "NoAccess",
        "roles": [
            {"group_id": 102, "group_name": "Editors", "role_name": "Editor", "role_class": "editor"}
        ],
        "comment": "Dieser Benutzer hat aktuell keinen Zugriff auf das conveniat27.ch-Backend."
    },
    {
        "id": "4",
        "email": "benutzer4@conveniat27.ch",
        "first_name": "WebCoreTeam User",
        "last_name": "WebCoreTeam",
        "nickname": "WebCore",
        "roles": [
            {"group_id": 105, "group_name": "Web Core Team", "role_name": "Web Core", "role_class": "editor"}
        ],
        "comment": "Dieser Benutzer gehört zum Web Core Team."
    },
    {
        "id": "5",
        "email": "benutzer5@conveniat27.ch",
        "first_name": "TranslationTeam User",
        "last_name": "TranslationTeam",
        "nickname": "TranslationTeam",
        "roles": [
            {"group_id": 106, "group_name": "Translation Team", "role_name": "Translation Team", "role_class": "editor"}
        ],
        "comment": "Dieser Benutzer gehört zum Translation Team." 
    },
    {
        "id": "6",
        "email": "benutzer6@conveniat27.ch",
        "first_name": "ProgramTeam User",
        "last_name": "ProgramTeam",
        "nickname": "ProgramTeam",
        "roles": [
            {"group_id": 107, "group_name": "Program Team", "role_name": "Program Team", "role_class": "editor"}
        ],
        "comment": "Dieser Benutzer gehört zum Program Team." 
    },
    {
        "id": "7",
        "email": "benutzer7@conveniat27.ch",
        "first_name": "MaterialTeam User",
        "last_name": "MaterialTeam",
        "nickname": "MaterialTeam",
        "roles": [
            {"group_id": 108, "group_name": "Material Team", "role_name": "Material Team", "role_class": "editor"}
        ],
        "comment": "Dieser Benutzer gehört zum Materialteam und führt das Materialdepot in der App."
    },
    {
        "id": "8",
        "email": "benutzer8@conveniat27.ch",
        "first_name": "Hof-Adressverwaltung",
        "last_name": "Nord und Süd",
        "nickname": "Adressverwaltung",
        "roles": [
            {"group_id": 990001, "group_name": "Hof Nord", "role_name": "Adressverwalter/-in", "role_class": "Group::MitgliederorganisationExterne::Adressverwalter"},
            {"group_id": 990002, "group_name": "Hof Süd", "role_name": "Adressverwalter/-in", "role_class": "Group::MitgliederorganisationExterne::Adressverwalter"},
            {"group_id": 990003, "group_name": "Hof Ost", "role_name": "Externe/-r", "role_class": "Group::MitgliederorganisationExterne::Externer"}
        ],
        "comment": "Adressverwaltung von Hof Nord und Hof Süd, nur Mitglied von Hof Ost: öffnet das Hof-Dashboard der ersten beiden."
    },
    {
        "id": "9",
        "email": "benutzer9@conveniat27.ch",
        "first_name": "Hof-Adressverwaltung",
        "last_name": "West",
        "nickname": "Hof West",
        "roles": [
            {"group_id": 990004, "group_name": "Hof West", "role_name": "Adressverwalter/-in", "role_class": "Group::MitgliederorganisationExterne::Adressverwalter"}
        ],
        "comment": "Adressverwaltung von Hof West allein: dessen Hof-Dashboard ist vollständig befüllt, mit Abgaben in jedem Status, Bestellungen und Stadtleben-Ständen."
    },
    {
        "id": "10",
        "email": "benutzer10@conveniat27.ch",
        "first_name": "Rechnungswesen User",
        "last_name": "Rechnungswesen",
        "nickname": "Rechnungswesen",
        "roles": [
            {"group_id": 540, "group_name": "Billing", "role_name": "Billing", "role_class": "billing"}
        ],
        "comment": "Dieser Benutzer gehört zum Rechnungswesen: öffnet das Adminpanel und sieht dort nur die Rechnungen."
    }
]

# Store issued tokens
ACTIVE_TOKENS = {}
CUSTOM_USERS = {}
_CUSTOM_LOGIN_COUNTER = 2000000


def next_custom_user_id():
    """Create a numeric Cevi.DB-style id that is unique for every custom login."""
    global _CUSTOM_LOGIN_COUNTER
    _CUSTOM_LOGIN_COUNTER += 1
    return str(_CUSTOM_LOGIN_COUNTER)


def resolve_user_by_id(user_id):
    """Look up both the preset fake users and any custom login created in the tester."""
    if user_id is None:
        return None
    return next((u for u in FAKE_USERS if u["id"] == user_id), CUSTOM_USERS.get(user_id))

@app.route('/favicon.ico')
def favicon():
    """Favicon"""
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route("/")
def home():
    """Homepage with a fake login screen"""
    return render_template(
        "login.html",
        users=FAKE_USERS,
        selectable_groups=SELECTABLE_GROUPS,
        redirect_uri="",
        state="",
    )

@app.route("/oauth/authorize")
def authorize():
    """OAuth2 Authorization Endpoint - User selects an account"""
    redirect_uri = request.args.get("redirect_uri") or ""
    # Returned unchanged with the code, as a real authorization server does (RFC 6749 4.1.2).
    state = request.args.get("state") or ""

    return render_template(
        "login.html",
        users=FAKE_USERS,
        selectable_groups=SELECTABLE_GROUPS,
        redirect_uri=redirect_uri,
        state=state,
    )

@app.route("/login", methods=["POST"])
def login():
    """Handles login and redirects to the given redirect_uri with a fake code"""
    redirect_uri = request.form.get("redirect_uri") or ""
    if redirect_uri == "None":
        redirect_uri = ""
    explicit_login = request.form.get("custom_login") == "true"

    if explicit_login:
        first_name = request.form.get("first_name", "Custom").strip() or "Custom"
        last_name = request.form.get("last_name", "User").strip() or "User"
        email = request.form.get("email", "").strip()
        nickname = request.form.get("nickname", "").strip()
        selected_group_ids = [
            int(group_id)
            for group_id in request.form.getlist("group_ids")
            if group_id
        ]
        user = build_custom_user(first_name, last_name, email, nickname, selected_group_ids)
        CUSTOM_USERS[user["id"]] = user
    else:
        user_id = request.form.get("user_id")
        user = resolve_user_by_id(user_id)
        if not user:
            return "User not found", 400

    fake_auth_code = f"fake-auth-code-{user['id']}"
    target_url = redirect_uri or "http://localhost:3000"
    separator = "&" if "?" in target_url else "?"
    state = request.form.get("state") or ""
    state_parameter = f"&state={quote(state, safe='')}" if state else ""
    return redirect(f"{target_url}{separator}code={fake_auth_code}{state_parameter}")

@app.route("/oauth/token", methods=["POST"])
def token():
    """OAuth2 Token Exchange - Returns a fake access token"""
    grant_type = request.form.get("grant_type") or request.args.get("grant_type")

    if grant_type == "refresh_token":
        refresh_token = request.form.get("refresh_token") or request.args.get("refresh_token")
        if not refresh_token:
            return jsonify({"error": "invalid_request", "error_description": "Missing refresh token"}), 400

        user_id = refresh_token.replace("fake-refresh-token-", "")
        user = resolve_user_by_id(user_id)
        if not user:
            return jsonify({"error": "invalid_grant", "error_description": "Invalid refresh token user"}), 400

        access_token = f"fake-token-{user['id']}"
        ACTIVE_TOKENS[access_token] = user

        return jsonify({
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 3600,
            "refresh_token": refresh_token,
            "created_at": int(time.time()),
        })

    if grant_type not in (None, "authorization_code"):
        return jsonify({"error": "unsupported_grant_type", "error_description": f"Unsupported grant type: {grant_type}"}), 400

    auth_code = request.form.get("code") or request.args.get("code")
    if not auth_code:
        return jsonify({"error": "invalid_request", "error_description": "Missing authorization code"}), 400

    try:
        user_id = auth_code.replace("fake-auth-code-", "")
    except ValueError:
        return jsonify({"error": "invalid_request", "error_description": "Invalid authorization code"}), 400

    user = resolve_user_by_id(user_id)
    if not user:
        return jsonify({"error": "invalid_grant", "error_description": "Invalid user"}), 400

    access_token = f"fake-token-{user['id']}"
    ACTIVE_TOKENS[access_token] = user

    refresh_token = f"fake-refresh-token-{user['id']}"

    response = {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 3600,
        "refresh_token": refresh_token,
        "created_at": int(time.time()),
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
