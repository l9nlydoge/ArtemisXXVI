#!/bin/sh
set -e
Frames=${1:-Tools/.cache/Trailer}
Out=${2:-public/Demo.mp4}
gst-launch-1.0 -q mp4mux name=mux faststart=true ! filesink location="$Out" \
  multifilesrc location="$Frames/f_%05d.jpg" index=0 stop-index=899 caps="image/jpeg,framerate=30/1" ! jpegdec ! videoconvert ! video/x-raw,format=I420 \
  ! x264enc bitrate=9000 speed-preset=slow key-int-max=60 ! video/x-h264,profile=high ! h264parse ! mux. \
  filesrc location="$Frames/Score.wav" ! wavparse ! audioconvert ! audioresample ! audio/x-raw,rate=48000,channels=2 ! voaacenc bitrate=192000 ! aacparse ! mux.
gst-discoverer-1.0 "$Out"
