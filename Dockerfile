#FROM golang:1.17-alpine AS gcsfuse
#RUN apk add --no-cache git
#ENV GOPATH /go
#RUN go install github.com/googlecloudplatform/gcsfuse@latest

FROM node:22-alpine AS builder

RUN mkdir -p /usr/src/trudesk
WORKDIR /usr/src/trudesk

COPY . /usr/src/trudesk

RUN apk add --no-cache --update bash make gcc g++ python3
RUN npm install --legacy-peer-deps --omit=dev
RUN cp -R node_modules prod_node_modules
RUN npm install --legacy-peer-deps
RUN npm run build
RUN rm -rf node_modules && mv prod_node_modules node_modules

FROM node:22-alpine
WORKDIR /usr/src/trudesk
RUN apk add --no-cache ca-certificates bash mongodb-tools && rm -rf /tmp/*
COPY --from=builder /usr/src/trudesk .
#COPY --from=gcsfuse /go/bin/gcsfuse /usr/local/bin

EXPOSE 8118

CMD [ "/bin/bash", "/usr/src/trudesk/startup.sh" ]
