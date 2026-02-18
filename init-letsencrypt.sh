#!/bin/bash

# This script initializes Let's Encrypt certificates for your domain
# Run this script once before starting docker compose for the first time

set -e

domain="scrum.strangeindustries.cloud"
email="s7r4ng3@gmail.com" # Add your email address here for certificate expiry notifications
staging=0 # Set to 1 if you're testing your setup to avoid hitting request limits

if [ -z "$email" ]; then
  echo "Error: Please set your email address in this script"
  exit 1
fi

echo "### Preparing directories ..."
mkdir -p ./certbot/conf/live/$domain
mkdir -p ./certbot/www

echo ""
echo "### Creating dummy certificate for $domain ..."
path="/etc/letsencrypt/live/$domain"
docker compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:2048 -days 1\
    -keyout '$path/privkey.pem' \
    -out '$path/fullchain.pem' \
    -subj '/CN=localhost'" certbot
cp ./certbot/conf/live/$domain/fullchain.pem ./certbot/conf/live/$domain/chain.pem

echo ""
echo "### Starting nginx ..."
docker compose up --force-recreate -d nginx

echo ""
echo "### Deleting dummy certificate for $domain ..."
docker compose run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$domain && \
  rm -Rf /etc/letsencrypt/archive/$domain && \
  rm -Rf /etc/letsencrypt/renewal/$domain.conf" certbot

echo ""
echo "### Requesting Let's Encrypt certificate for $domain ..."

# Select appropriate email argument
case "$email" in
  "") email_arg="--register-unsafely-without-email" ;;
  *) email_arg="--email $email" ;;
esac

# Enable staging mode if needed
if [ $staging != "0" ]; then staging_arg="--staging"; fi

docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    -d $domain \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal" certbot

echo ""
echo "### Reloading nginx ..."
docker compose exec nginx nginx -s reload

echo ""
echo "### Certificate initialization complete!"
echo "You can now run: docker compose up -d"
