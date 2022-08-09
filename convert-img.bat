mogrify -colorspace Gray -ordered-dither o8x8,4 -colorspace sRGB -fuzz 0%% -fill "#00108b" -opaque "#000000" -fuzz 0%% -fill "#55b4ff" -opaque "#555555" -fuzz 0%% -fill "#ffd966" -opaque "#AAAAAA" -fuzz 0%% -fill "#FFFFFF" -opaque "#FFFFFF" -format png

convert  -rotate <%= get('angle') %> -scale <%= get('scale') %> foo.gif