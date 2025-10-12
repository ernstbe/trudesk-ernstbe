Local Docker setup notes

1. Copy `.env.example` to `.env` and change passwords for local use (do not commit `.env`).

2. Start services:

```powershell
docker compose up -d
```

3. Check logs:

```powershell
docker compose logs -f mongo
docker compose logs -f trudesk
```

4. Verify DB users:

```powershell
docker exec -it <mongo_container> mongosh --quiet --eval "db.getSiblingDB('admin').getUsers()"
```

5. If you want the app to connect with a non-admin account, create a dedicated app user in the mongo container (see README for commands).
