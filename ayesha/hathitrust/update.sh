#!/bin/bash

# this file has bee deprecated
# the root certificate was used
export CLASSPATH=bcprov-jdk18on-1.78.1.jar

SERVER=hathitrust.org:443
CERT=cert.pem
STORE=store.bks

if [ -a $CERT ]; then
    rm $CERT || exit 1
fi

echo \
    | openssl s_client -connect $SERVER 2>&1 \
    | sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p' \
    > $CERT

if [ -a $STORE ]; then
    rm $STORE || exit 1
fi
yes | keytool \
      -import \
      -v \
      -trustcacerts \
      -alias 0 \
      -file $CERT \
      -keystore $STORE \
      -storetype BKS \
      -provider org.bouncycastle.jce.provider.BouncyCastleProvider \
      -providerpath bcprov-jdk18on-1.78.1.jar \
      -storepass hathitrust.org
