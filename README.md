# WebGL

1.In polarized glasses I saw my figure with the effect of depth
To achieve binocular disparity in a WebGL application using orthographic projection, was implemented custom logic and shaders. Here's a high-level overview of the steps I made:

I set up two cameras: One for the left eye and one for the right eye. Each camera have its own view and projection matrices. (left, right, orthographic )

I rendered the scene twice, once for each camera, but with slightly different viewpoints corresponding to the desired disparity.

I combined the resulting left and right eye renderings into a single stereo image or apply additional techniques like anaglyph rendering (red-cyan glasses) or shutter glasses to achieve the perception of depth.


Project that accompanies VGGI credit module.

Visit vggi-kpi.blogspot.com for more information

![](CGW.gif)

![](img.jpg)
