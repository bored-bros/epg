FROM node:18-alpine

WORKDIR /app

# Copy application files
COPY . .

RUN npm install
RUN npm postinstall

# Set command and default arguments
ENTRYPOINT ["npm", "run", "grab", "--"]
CMD ["--site=example.com"]
