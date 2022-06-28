git push origin main
ssh $DROPLET_USER@$DROPLET_IP \
    "cd /home/$DROPLET_USER/code/sso && "\
    "git pull origin main"