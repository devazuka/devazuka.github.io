
:: Usage: gb.bat <Input filename> <Output width> <Output height> <Frame rate> <Output filename>
::
:: Example 1:
:: gb.bat in.mp4 320 180 8 out.mp4
::
:: Example 2 (Maintain ratio, increased frame rate):
:: gb.bat in.mp4 480 -1 12 out.mp4
::
:: FFmpeg and ImageMagick mogrify required.
:: This script assumes you are using the portable versions, or the executable is added to your PATH variable.
:: https://www.ffmpeg.org/download.html
:: https://www.imagemagick.org/script/download.php

set videoname=%1
set widthres=%2
set heightres=%3
set fps=%4
set outputname=%5

echo Exporting video frames ...
ffmpeg -loglevel quiet -y -i %videoname% -vf fps=%fps%,scale=%widthres%:%heightres% videoout%%d.png
ffmpeg -loglevel quiet -y -i %videoname% -vn -acodec copy audio.aac

// #306230 - dark green
// #8BAC0F - mid green
// #9BBC0F - light green

echo Editing frames ...
mogrify -colorspace Gray -ordered-dither o8x8,4 -colorspace sRGB \
  -fuzz 0%% -fill "#00108b" -opaque "#000000" \
  -fuzz 0%% -fill "#55b4ff" -opaque "#555555" \
  -fuzz 0%% -fill "#ffd966" -opaque "#AAAAAA" \
  -fuzz 0%% -fill "#FFFFFF" -opaque "#FFFFFF" -format png place.jpeg

echo Cleaning up ...
del videoout*.png
del videoout*.png~
del audio.aac
echo Done!