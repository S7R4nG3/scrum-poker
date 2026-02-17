#!/bin/bash

# This script initializes Let's Encrypt certificates for your domain using DNS-01 validation
# Run this script once before starting docker-compose for the first time

set -e

domain="scrum.strangeindustries.cloud"
email="s7r4ng3@gmail.com" # Add your email address here for certificate expiry notifications
staging=0 # Set to 1 if you're testing your setup to avoid hitting request limits

if [ -z "$email" ]; then
  echo "Error: Please set your email address in this script"
  exit 1
fi

if [ -z "$HOSTINGER_API_KEY" ]; then
  echo "Error: HOSTINGER_API_KEY environment variable is not set"
  echo "Please export your Hostinger API key: export HOSTINGER_API_KEY=your_api_key"
  exit 1
fi

echo "### Preparing directories ..."
mkdir -p ./certbot/conf/live/$domain

echo ""
echo "### Creating dummy certificate for $domain ..."
path="/acme.sh/live/$domain"
docker-compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:2048 -days 1\
    -keyout '$path/privkey.pem' \
    -out '$path/fullchain.pem' \
    -subj '/CN=localhost'" acme

echo ""
echo "### Starting nginx ..."
docker-compose up --force-recreate -d nginx

echo ""
echo "### Deleting dummy certificate for $domain ..."
docker-compose run --rm --entrypoint "\
  rm -Rf /acme.sh/live/$domain && \
  rm -Rf /acme.sh/$domain" acme

echo ""
echo "### Requesting Let's Encrypt certificate for $domain using DNS-01 validation ..."

# Enable staging mode if needed
if [ $staging != "0" ]; then staging_arg="--staging"; fi

# Issue certificate using Hostinger DNS API
docker-compose run --rm -e HOSTINGER_API_KEY=$HOSTINGER_API_KEY acme \
  --issue --dns dns_hostinger \
  -d $domain \
  --keylength 4096 \
  --accountemail $email \
  $staging_arg

# Install certificate to the nginx-compatible location
docker-compose run --rm -e HOSTINGER_API_KEY=$HOSTINGER_API_KEY acme \
  --install-cert -d $domain \
  --cert-file /acme.sh/live/$domain/cert.pem \
  --key-file /acme.sh/live/$domain/privkey.pem \
  --fullchain-file /acme.sh/live/$domain/fullchain.pem \
  --ca-file /acme.sh/live/$domain/chain.pem

echo ""
echo "### Reloading nginx ..."
docker-compose exec nginx nginx -s reload

echo ""
echo "### Certificate initialization complete!"
echo "You can now run: docker-compose up -d"
