# Deployment Guide - HTTPS with Let's Encrypt

This guide explains how to deploy the Scrum Poker app with HTTPS using Let's Encrypt certificates.

## Prerequisites

1. A domain name pointing to your server's IP address (e.g., `scrum.strangeindustries.cloud`)
2. Docker and Docker Compose installed on your server
3. Ports 80 and 443 open in your firewall

## Initial Setup

### 1. Configure Email for Certificate Notifications

Edit `init-letsencrypt.sh` and add your email address:

```bash
email="your-email@example.com"
```

This email will receive notifications about certificate expiration (Let's Encrypt certificates expire every 90 days, but auto-renewal is configured).

### 2. Optional: Test with Staging Environment

If you want to test the setup first without hitting Let's Encrypt rate limits, set:

```bash
staging=1
```

Once everything works, change it back to `staging=0` and run the script again to get production certificates.

### 3. Initialize Let's Encrypt Certificates

Run the initialization script:

```bash
./init-letsencrypt.sh
```

This script will:
- Create necessary directories
- Generate a dummy certificate to start nginx
- Request a real Let's Encrypt certificate
- Reload nginx with the new certificate

### 4. Start All Services

After the certificates are initialized, start all services:

```bash
docker-compose up -d
```

Your app will now be available at:
- **HTTPS**: https://scrum.strangeindustries.cloud
- **HTTP**: http://scrum.strangeindustries.cloud (automatically redirects to HTTPS)

## Architecture

The deployment uses the following components:

### Nginx (Reverse Proxy)
- Handles SSL/TLS termination
- Redirects HTTP to HTTPS
- Proxies requests to client and server containers
- Supports WebSocket connections for Socket.io
- Applies security headers and rate limiting

### Certbot
- Obtains Let's Encrypt certificates
- Automatically renews certificates every 12 hours
- Certificates are valid for 90 days

### Client & Server
- Not exposed directly to the internet
- Communicate through nginx reverse proxy

## Certificate Renewal

Certificates are automatically renewed by the certbot container, which checks for renewal every 12 hours. Let's Encrypt certificates are valid for 90 days and are renewed when they have 30 days or less remaining.

To manually renew certificates:

```bash
docker-compose run --rm certbot renew
docker-compose exec nginx nginx -s reload
```

## Monitoring Certificate Expiration

Check certificate expiration date:

```bash
docker-compose run --rm certbot certificates
```

Or use OpenSSL:

```bash
echo | openssl s_client -servername scrum.strangeindustries.cloud -connect scrum.strangeindustries.cloud:443 2>/dev/null | openssl x509 -noout -dates
```

## Troubleshooting

### Certificate Verification Failed

If you get certificate errors, check:
1. Domain DNS points to your server IP
2. Ports 80 and 443 are open
3. No other services are using ports 80/443

### WebSocket Connection Issues

If real-time features don't work:
1. Check nginx logs: `docker-compose logs nginx`
2. Check server logs: `docker-compose logs server`
3. Verify CORS settings in `server/index.js`

### Rate Limiting

Let's Encrypt has rate limits:
- 50 certificates per registered domain per week
- 5 duplicate certificates per week

Use `staging=1` in `init-letsencrypt.sh` for testing to avoid hitting these limits.

## Security Features

### SSL/TLS Configuration
- TLS 1.2 and 1.3 only
- Strong cipher suites (Mozilla Intermediate profile)
- Perfect Forward Secrecy (PFS)
- OCSP Stapling

### Security Headers
- HSTS (Strict-Transport-Security)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

### Rate Limiting
- General requests: 10 per second
- WebSocket connections: 30 per second
- Burst capacity: 20 requests

## Updating the Application

To update the application with zero downtime:

```bash
# Pull latest changes
git pull

# Rebuild and restart services
docker-compose up -d --build

# Nginx will automatically reload without dropping connections
```

## Backup

Important files to backup:
- `./certbot/conf/` - Certificate files
- `docker-compose.yml` - Service configuration
- `nginx.conf` - Nginx configuration

## Logs

View logs for each service:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f nginx
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f certbot
```

## Production Checklist

- [ ] Domain DNS configured and propagated
- [ ] Email added to `init-letsencrypt.sh`
- [ ] Firewall allows ports 80 and 443
- [ ] Certificates initialized successfully
- [ ] HTTPS redirect working
- [ ] WebSocket connections working
- [ ] Auto-renewal tested
- [ ] Monitoring set up for certificate expiration
- [ ] Regular backups configured
