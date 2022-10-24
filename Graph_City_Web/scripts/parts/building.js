import * as THREE from '../../lib/three/build/three.module.js';
import * as BUSH from '../bush.js';
import { SVGLoader } from '../../lib/three/examples/jsm/loaders/SVGLoader.js'

//////// for glyph, copyed from cityMap.js
function interpolateLinearly(x, values) {

  // Split values into four lists
  var x_values = [];
  var r_values = [];
  var g_values = [];
  var b_values = [];
  for (i in values) {
      x_values.push(values[i][0]);
      r_values.push(values[i][1][0]);
      g_values.push(values[i][1][1]);
      b_values.push(values[i][1][2]);
  }

  var i = 1;
  while (x_values[i] < x) {
      i = i + 1;
  }
  i = i - 1;

  var width = Math.abs(x_values[i] - x_values[i + 1]);
  var scaling_factor = (x - x_values[i]) / width;

  // Get the new color values though interpolation
  var r = r_values[i] + scaling_factor * (r_values[i + 1] - r_values[i])
  var g = g_values[i] + scaling_factor * (g_values[i + 1] - g_values[i])
  var b = b_values[i] + scaling_factor * (b_values[i + 1] - b_values[i])

  return [enforceBounds(r), enforceBounds(g), enforceBounds(b)];

}

function enforceBounds(x) {
  if (x < 0) {
      return 0;
  } else if (x > 1) {
      return 1;
  } else {
      return x;
  }
}

const grey2red = [[0.000, [0.780, 0.780, 0.780]], [0.002, [0.778, 0.779, 0.780]], [0.004, [0.776, 0.778, 0.780]], [0.006, [0.774, 0.778, 0.780]], [0.008, [0.772, 0.777, 0.780]], [0.010, [0.769, 0.776, 0.781]], [0.012, [0.767, 0.775, 0.781]], [0.014, [0.765, 0.774, 0.781]], [0.016, [0.763, 0.774, 0.781]], [0.018, [0.761, 0.773, 0.781]], [0.020, [0.758, 0.772, 0.782]], [0.022, [0.756, 0.772, 0.782]], [0.024, [0.754, 0.771, 0.782]], [0.026, [0.752, 0.770, 0.782]], [0.028, [0.750, 0.770, 0.782]], [0.030, [0.747, 0.769, 0.783]], [0.032, [0.745, 0.769, 0.783]], [0.034, [0.743, 0.768, 0.783]], [0.036, [0.741, 0.767, 0.783]], [0.038, [0.738, 0.767, 0.784]], [0.040, [0.736, 0.766, 0.784]], [0.042, [0.734, 0.766, 0.784]], [0.044, [0.731, 0.765, 0.785]], [0.046, [0.729, 0.765, 0.785]], [0.048, [0.727, 0.765, 0.785]], [0.050, [0.724, 0.764, 0.786]], [0.052, [0.722, 0.764, 0.786]], [0.054, [0.720, 0.763, 0.786]], [0.056, [0.717, 0.763, 0.787]], [0.058, [0.715, 0.763, 0.787]], [0.060, [0.712, 0.762, 0.788]], [0.062, [0.710, 0.762, 0.788]], [0.064, [0.708, 0.762, 0.788]], [0.066, [0.705, 0.762, 0.789]], [0.068, [0.703, 0.762, 0.789]], [0.070, [0.700, 0.761, 0.790]], [0.072, [0.698, 0.761, 0.790]], [0.074, [0.695, 0.761, 0.791]], [0.076, [0.693, 0.761, 0.791]], [0.078, [0.690, 0.761, 0.792]], [0.080, [0.688, 0.761, 0.792]], [0.082, [0.685, 0.761, 0.793]], [0.084, [0.683, 0.761, 0.793]], [0.086, [0.680, 0.761, 0.794]], [0.088, [0.678, 0.761, 0.794]], [0.090, [0.675, 0.761, 0.795]], [0.092, [0.673, 0.761, 0.795]], [0.094, [0.670, 0.761, 0.796]], [0.096, [0.668, 0.761, 0.796]], [0.098, [0.665, 0.761, 0.797]], [0.100, [0.662, 0.761, 0.797]], [0.102, [0.660, 0.762, 0.798]], [0.104, [0.657, 0.762, 0.799]], [0.106, [0.655, 0.762, 0.799]], [0.108, [0.652, 0.762, 0.800]], [0.110, [0.649, 0.763, 0.801]], [0.112, [0.647, 0.763, 0.801]], [0.114, [0.644, 0.764, 0.802]], [0.116, [0.641, 0.764, 0.803]], [0.118, [0.639, 0.764, 0.803]], [0.120, [0.636, 0.765, 0.804]], [0.122, [0.633, 0.765, 0.805]], [0.124, [0.631, 0.766, 0.805]], [0.126, [0.628, 0.766, 0.806]], [0.128, [0.625, 0.767, 0.807]], [0.130, [0.622, 0.767, 0.808]], [0.132, [0.620, 0.768, 0.808]], [0.134, [0.617, 0.769, 0.809]], [0.136, [0.614, 0.769, 0.810]], [0.138, [0.611, 0.770, 0.811]], [0.140, [0.608, 0.771, 0.812]], [0.142, [0.606, 0.772, 0.812]], [0.144, [0.603, 0.772, 0.813]], [0.146, [0.600, 0.773, 0.814]], [0.148, [0.597, 0.774, 0.815]], [0.150, [0.594, 0.775, 0.816]], [0.152, [0.592, 0.776, 0.816]], [0.154, [0.589, 0.777, 0.817]], [0.156, [0.586, 0.778, 0.818]], [0.158, [0.583, 0.779, 0.819]], [0.160, [0.580, 0.780, 0.820]], [0.162, [0.577, 0.781, 0.821]], [0.164, [0.574, 0.782, 0.822]], [0.166, [0.571, 0.783, 0.823]], [0.168, [0.568, 0.785, 0.824]], [0.170, [0.565, 0.786, 0.825]], [0.172, [0.562, 0.787, 0.826]], [0.174, [0.559, 0.788, 0.827]], [0.176, [0.556, 0.790, 0.828]], [0.178, [0.553, 0.791, 0.829]], [0.180, [0.550, 0.792, 0.829]], [0.182, [0.547, 0.794, 0.831]], [0.184, [0.544, 0.795, 0.832]], [0.186, [0.541, 0.797, 0.833]], [0.188, [0.538, 0.798, 0.834]], [0.190, [0.535, 0.800, 0.835]], [0.192, [0.532, 0.801, 0.836]], [0.194, [0.529, 0.803, 0.837]], [0.196, [0.526, 0.805, 0.838]], [0.198, [0.523, 0.806, 0.839]], [0.200, [0.520, 0.808, 0.840]], [0.202, [0.517, 0.810, 0.841]], [0.204, [0.514, 0.812, 0.842]], [0.206, [0.511, 0.813, 0.843]], [0.208, [0.508, 0.815, 0.844]], [0.210, [0.504, 0.817, 0.846]], [0.212, [0.501, 0.819, 0.847]], [0.214, [0.498, 0.821, 0.848]], [0.216, [0.495, 0.823, 0.849]], [0.218, [0.492, 0.825, 0.850]], [0.220, [0.489, 0.827, 0.851]], [0.222, [0.485, 0.829, 0.853]], [0.224, [0.482, 0.832, 0.854]], [0.226, [0.479, 0.834, 0.855]], [0.228, [0.476, 0.836, 0.856]], [0.230, [0.472, 0.838, 0.858]], [0.232, [0.469, 0.841, 0.859]], [0.234, [0.466, 0.843, 0.860]], [0.236, [0.463, 0.845, 0.861]], [0.238, [0.459, 0.848, 0.863]], [0.240, [0.456, 0.850, 0.864]], [0.242, [0.453, 0.853, 0.865]], [0.244, [0.449, 0.855, 0.867]], [0.246, [0.446, 0.858, 0.868]], [0.248, [0.443, 0.861, 0.869]], [0.250, [0.439, 0.863, 0.871]], [0.252, [0.436, 0.866, 0.872]], [0.254, [0.433, 0.869, 0.873]], [0.256, [0.429, 0.872, 0.875]], [0.258, [0.426, 0.875, 0.876]], [0.260, [0.422, 0.877, 0.877]], [0.262, [0.419, 0.879, 0.877]], [0.264, [0.416, 0.880, 0.877]], [0.266, [0.412, 0.882, 0.877]], [0.268, [0.409, 0.883, 0.877]], [0.270, [0.405, 0.885, 0.877]], [0.272, [0.402, 0.886, 0.876]], [0.274, [0.398, 0.888, 0.876]], [0.276, [0.395, 0.889, 0.876]], [0.278, [0.391, 0.891, 0.876]], [0.280, [0.388, 0.892, 0.875]], [0.282, [0.384, 0.894, 0.875]], [0.284, [0.381, 0.895, 0.874]], [0.286, [0.377, 0.897, 0.874]], [0.288, [0.374, 0.898, 0.874]], [0.290, [0.370, 0.900, 0.873]], [0.292, [0.367, 0.901, 0.873]], [0.294, [0.363, 0.903, 0.872]], [0.296, [0.360, 0.904, 0.872]], [0.298, [0.356, 0.906, 0.871]], [0.300, [0.353, 0.907, 0.871]], [0.302, [0.349, 0.909, 0.870]], [0.304, [0.345, 0.911, 0.869]], [0.306, [0.342, 0.912, 0.869]], [0.308, [0.338, 0.914, 0.868]], [0.310, [0.334, 0.916, 0.867]], [0.312, [0.331, 0.917, 0.866]], [0.314, [0.327, 0.919, 0.866]], [0.316, [0.323, 0.921, 0.865]], [0.318, [0.320, 0.922, 0.864]], [0.320, [0.316, 0.924, 0.863]], [0.322, [0.312, 0.926, 0.862]], [0.324, [0.309, 0.927, 0.861]], [0.326, [0.305, 0.929, 0.860]], [0.328, [0.301, 0.931, 0.860]], [0.330, [0.297, 0.933, 0.859]], [0.332, [0.294, 0.934, 0.857]], [0.334, [0.290, 0.936, 0.856]], [0.336, [0.286, 0.938, 0.855]], [0.338, [0.282, 0.940, 0.854]], [0.340, [0.278, 0.942, 0.853]], [0.342, [0.275, 0.943, 0.852]], [0.344, [0.271, 0.945, 0.851]], [0.346, [0.267, 0.947, 0.849]], [0.348, [0.263, 0.949, 0.848]], [0.350, [0.259, 0.951, 0.847]], [0.352, [0.256, 0.952, 0.846]], [0.354, [0.252, 0.954, 0.844]], [0.356, [0.248, 0.956, 0.843]], [0.358, [0.244, 0.958, 0.841]], [0.360, [0.240, 0.960, 0.840]], [0.362, [0.236, 0.962, 0.839]], [0.364, [0.232, 0.964, 0.837]], [0.366, [0.228, 0.966, 0.835]], [0.368, [0.224, 0.968, 0.834]], [0.370, [0.220, 0.970, 0.832]], [0.372, [0.216, 0.972, 0.831]], [0.374, [0.212, 0.974, 0.829]], [0.376, [0.208, 0.976, 0.827]], [0.378, [0.204, 0.978, 0.825]], [0.380, [0.200, 0.980, 0.824]], [0.382, [0.196, 0.982, 0.822]], [0.384, [0.192, 0.984, 0.820]], [0.386, [0.188, 0.986, 0.818]], [0.388, [0.184, 0.988, 0.816]], [0.390, [0.180, 0.990, 0.814]], [0.392, [0.176, 0.992, 0.812]], [0.394, [0.172, 0.994, 0.810]], [0.396, [0.168, 0.996, 0.808]], [0.398, [0.164, 0.998, 0.806]], [0.400, [0.160, 1.000, 0.804]], [0.402, [0.161, 1.000, 0.806]], [0.404, [0.174, 1.000, 0.794]], [0.406, [0.174, 1.000, 0.794]], [0.408, [0.187, 1.000, 0.781]], [0.410, [0.187, 1.000, 0.781]], [0.412, [0.199, 1.000, 0.769]], [0.414, [0.199, 1.000, 0.769]], [0.416, [0.212, 1.000, 0.756]], [0.418, [0.225, 1.000, 0.743]], [0.420, [0.225, 1.000, 0.743]], [0.422, [0.237, 1.000, 0.731]], [0.424, [0.237, 1.000, 0.731]], [0.426, [0.250, 1.000, 0.718]], [0.428, [0.250, 1.000, 0.718]], [0.430, [0.262, 1.000, 0.705]], [0.432, [0.262, 1.000, 0.705]], [0.434, [0.275, 1.000, 0.693]], [0.436, [0.275, 1.000, 0.693]], [0.438, [0.288, 1.000, 0.680]], [0.440, [0.288, 1.000, 0.680]], [0.442, [0.300, 1.000, 0.667]], [0.444, [0.300, 1.000, 0.667]], [0.446, [0.313, 1.000, 0.655]], [0.448, [0.313, 1.000, 0.655]], [0.450, [0.326, 1.000, 0.642]], [0.452, [0.326, 1.000, 0.642]], [0.454, [0.338, 1.000, 0.629]], [0.456, [0.338, 1.000, 0.629]], [0.458, [0.351, 1.000, 0.617]], [0.460, [0.351, 1.000, 0.617]], [0.462, [0.364, 1.000, 0.604]], [0.464, [0.364, 1.000, 0.604]], [0.466, [0.376, 1.000, 0.591]], [0.468, [0.376, 1.000, 0.591]], [0.470, [0.389, 1.000, 0.579]], [0.472, [0.389, 1.000, 0.579]], [0.474, [0.402, 1.000, 0.566]], [0.476, [0.402, 1.000, 0.566]], [0.478, [0.414, 1.000, 0.553]], [0.480, [0.414, 1.000, 0.553]], [0.482, [0.427, 1.000, 0.541]], [0.484, [0.427, 1.000, 0.541]], [0.486, [0.440, 1.000, 0.528]], [0.488, [0.440, 1.000, 0.528]], [0.490, [0.452, 1.000, 0.515]], [0.492, [0.452, 1.000, 0.515]], [0.494, [0.465, 1.000, 0.503]], [0.496, [0.465, 1.000, 0.503]], [0.498, [0.478, 1.000, 0.490]], [0.500, [0.490, 1.000, 0.478]], [0.502, [0.490, 1.000, 0.478]], [0.504, [0.503, 1.000, 0.465]], [0.506, [0.503, 1.000, 0.465]], [0.508, [0.515, 1.000, 0.452]], [0.510, [0.515, 1.000, 0.452]], [0.512, [0.528, 1.000, 0.440]], [0.514, [0.528, 1.000, 0.440]], [0.516, [0.541, 1.000, 0.427]], [0.518, [0.541, 1.000, 0.427]], [0.520, [0.553, 1.000, 0.414]], [0.522, [0.553, 1.000, 0.414]], [0.524, [0.566, 1.000, 0.402]], [0.526, [0.566, 1.000, 0.402]], [0.528, [0.579, 1.000, 0.389]], [0.530, [0.579, 1.000, 0.389]], [0.532, [0.591, 1.000, 0.376]], [0.534, [0.591, 1.000, 0.376]], [0.536, [0.604, 1.000, 0.364]], [0.538, [0.604, 1.000, 0.364]], [0.540, [0.617, 1.000, 0.351]], [0.542, [0.617, 1.000, 0.351]], [0.544, [0.629, 1.000, 0.338]], [0.546, [0.629, 1.000, 0.338]], [0.548, [0.642, 1.000, 0.326]], [0.550, [0.642, 1.000, 0.326]], [0.552, [0.655, 1.000, 0.313]], [0.554, [0.655, 1.000, 0.313]], [0.556, [0.667, 1.000, 0.300]], [0.558, [0.667, 1.000, 0.300]], [0.560, [0.680, 1.000, 0.288]], [0.562, [0.680, 1.000, 0.288]], [0.564, [0.693, 1.000, 0.275]], [0.566, [0.693, 1.000, 0.275]], [0.568, [0.705, 1.000, 0.262]], [0.570, [0.705, 1.000, 0.262]], [0.572, [0.718, 1.000, 0.250]], [0.574, [0.718, 1.000, 0.250]], [0.576, [0.731, 1.000, 0.237]], [0.578, [0.731, 1.000, 0.237]], [0.580, [0.743, 1.000, 0.225]], [0.582, [0.743, 1.000, 0.225]], [0.584, [0.756, 1.000, 0.212]], [0.586, [0.769, 1.000, 0.199]], [0.588, [0.769, 1.000, 0.199]], [0.590, [0.781, 1.000, 0.187]], [0.592, [0.781, 1.000, 0.187]], [0.594, [0.794, 1.000, 0.174]], [0.596, [0.794, 1.000, 0.174]], [0.598, [0.806, 1.000, 0.161]], [0.600, [0.806, 1.000, 0.161]], [0.602, [0.819, 1.000, 0.149]], [0.604, [0.819, 1.000, 0.149]], [0.606, [0.832, 1.000, 0.136]], [0.608, [0.832, 1.000, 0.136]], [0.610, [0.844, 1.000, 0.123]], [0.612, [0.844, 1.000, 0.123]], [0.614, [0.857, 1.000, 0.111]], [0.616, [0.857, 1.000, 0.111]], [0.618, [0.870, 1.000, 0.098]], [0.620, [0.870, 1.000, 0.098]], [0.622, [0.882, 1.000, 0.085]], [0.624, [0.882, 1.000, 0.085]], [0.626, [0.895, 1.000, 0.073]], [0.628, [0.895, 1.000, 0.073]], [0.630, [0.908, 1.000, 0.060]], [0.632, [0.908, 1.000, 0.060]], [0.634, [0.920, 1.000, 0.047]], [0.636, [0.920, 1.000, 0.047]], [0.638, [0.933, 1.000, 0.035]], [0.640, [0.933, 1.000, 0.035]], [0.642, [0.946, 0.988, 0.022]], [0.644, [0.946, 0.988, 0.022]], [0.646, [0.958, 0.974, 0.009]], [0.648, [0.958, 0.974, 0.009]], [0.650, [0.971, 0.959, 0.000]], [0.652, [0.971, 0.959, 0.000]], [0.654, [0.984, 0.945, 0.000]], [0.656, [0.984, 0.945, 0.000]], [0.658, [0.996, 0.930, 0.000]], [0.660, [0.996, 0.930, 0.000]], [0.662, [1.000, 0.916, 0.000]], [0.664, [1.000, 0.916, 0.000]], [0.666, [1.000, 0.901, 0.000]], [0.668, [1.000, 0.887, 0.000]], [0.670, [1.000, 0.887, 0.000]], [0.672, [1.000, 0.872, 0.000]], [0.674, [1.000, 0.872, 0.000]], [0.676, [1.000, 0.858, 0.000]], [0.678, [1.000, 0.858, 0.000]], [0.680, [1.000, 0.843, 0.000]], [0.682, [1.000, 0.843, 0.000]], [0.684, [1.000, 0.829, 0.000]], [0.686, [1.000, 0.829, 0.000]], [0.688, [1.000, 0.814, 0.000]], [0.690, [1.000, 0.814, 0.000]], [0.692, [1.000, 0.800, 0.000]], [0.694, [1.000, 0.800, 0.000]], [0.696, [1.000, 0.785, 0.000]], [0.698, [1.000, 0.785, 0.000]], [0.700, [1.000, 0.771, 0.000]], [0.702, [1.000, 0.771, 0.000]], [0.704, [1.000, 0.756, 0.000]], [0.706, [1.000, 0.756, 0.000]], [0.708, [1.000, 0.741, 0.000]], [0.710, [1.000, 0.741, 0.000]], [0.712, [1.000, 0.727, 0.000]], [0.714, [1.000, 0.727, 0.000]], [0.716, [1.000, 0.712, 0.000]], [0.718, [1.000, 0.712, 0.000]], [0.720, [1.000, 0.698, 0.000]], [0.722, [1.000, 0.698, 0.000]], [0.724, [1.000, 0.683, 0.000]], [0.726, [1.000, 0.683, 0.000]], [0.728, [1.000, 0.669, 0.000]], [0.730, [1.000, 0.669, 0.000]], [0.732, [1.000, 0.654, 0.000]], [0.734, [1.000, 0.654, 0.000]], [0.736, [1.000, 0.640, 0.000]], [0.738, [1.000, 0.640, 0.000]], [0.740, [1.000, 0.625, 0.000]], [0.742, [1.000, 0.625, 0.000]], [0.744, [1.000, 0.611, 0.000]], [0.746, [1.000, 0.611, 0.000]], [0.748, [1.000, 0.596, 0.000]], [0.750, [1.000, 0.582, 0.000]], [0.752, [1.000, 0.582, 0.000]], [0.754, [1.000, 0.567, 0.000]], [0.756, [1.000, 0.567, 0.000]], [0.758, [1.000, 0.553, 0.000]], [0.760, [1.000, 0.553, 0.000]], [0.762, [1.000, 0.538, 0.000]], [0.764, [1.000, 0.538, 0.000]], [0.766, [1.000, 0.524, 0.000]], [0.768, [1.000, 0.524, 0.000]], [0.770, [1.000, 0.509, 0.000]], [0.772, [1.000, 0.509, 0.000]], [0.774, [1.000, 0.495, 0.000]], [0.776, [1.000, 0.495, 0.000]], [0.778, [1.000, 0.480, 0.000]], [0.780, [1.000, 0.480, 0.000]], [0.782, [1.000, 0.466, 0.000]], [0.784, [1.000, 0.466, 0.000]], [0.786, [1.000, 0.451, 0.000]], [0.788, [1.000, 0.451, 0.000]], [0.790, [1.000, 0.436, 0.000]], [0.792, [1.000, 0.436, 0.000]], [0.794, [1.000, 0.422, 0.000]], [0.796, [1.000, 0.422, 0.000]], [0.798, [1.000, 0.407, 0.000]], [0.800, [1.000, 0.407, 0.000]], [0.802, [1.000, 0.393, 0.000]], [0.804, [1.000, 0.393, 0.000]], [0.806, [1.000, 0.378, 0.000]], [0.808, [1.000, 0.378, 0.000]], [0.810, [1.000, 0.364, 0.000]], [0.812, [1.000, 0.364, 0.000]], [0.814, [1.000, 0.349, 0.000]], [0.816, [1.000, 0.349, 0.000]], [0.818, [1.000, 0.335, 0.000]], [0.820, [1.000, 0.335, 0.000]], [0.822, [1.000, 0.320, 0.000]], [0.824, [1.000, 0.320, 0.000]], [0.826, [1.000, 0.306, 0.000]], [0.828, [1.000, 0.306, 0.000]], [0.830, [1.000, 0.291, 0.000]], [0.832, [1.000, 0.291, 0.000]], [0.834, [1.000, 0.277, 0.000]], [0.836, [1.000, 0.262, 0.000]], [0.838, [1.000, 0.262, 0.000]], [0.840, [1.000, 0.248, 0.000]], [0.842, [1.000, 0.248, 0.000]], [0.844, [1.000, 0.233, 0.000]], [0.846, [1.000, 0.233, 0.000]], [0.848, [1.000, 0.219, 0.000]], [0.850, [1.000, 0.219, 0.000]], [0.852, [1.000, 0.204, 0.000]], [0.854, [1.000, 0.204, 0.000]], [0.856, [1.000, 0.190, 0.000]], [0.858, [1.000, 0.190, 0.000]], [0.860, [1.000, 0.175, 0.000]], [0.862, [1.000, 0.175, 0.000]], [0.864, [1.000, 0.160, 0.000]], [0.866, [1.000, 0.160, 0.000]], [0.868, [1.000, 0.146, 0.000]], [0.870, [1.000, 0.146, 0.000]], [0.872, [1.000, 0.131, 0.000]], [0.874, [1.000, 0.131, 0.000]], [0.876, [1.000, 0.117, 0.000]], [0.878, [1.000, 0.117, 0.000]], [0.880, [1.000, 0.102, 0.000]], [0.882, [1.000, 0.102, 0.000]], [0.884, [1.000, 0.088, 0.000]], [0.886, [1.000, 0.088, 0.000]], [0.888, [0.999, 0.073, 0.000]], [0.890, [0.999, 0.073, 0.000]], [0.892, [0.981, 0.059, 0.000]], [0.894, [0.981, 0.059, 0.000]], [0.896, [0.963, 0.044, 0.000]], [0.898, [0.963, 0.044, 0.000]], [0.900, [0.946, 0.030, 0.000]], [0.902, [0.946, 0.030, 0.000]], [0.904, [0.928, 0.015, 0.000]], [0.906, [0.928, 0.015, 0.000]], [0.908, [0.910, 0.001, 0.000]], [0.910, [0.910, 0.001, 0.000]], [0.912, [0.892, 0.000, 0.000]], [0.914, [0.892, 0.000, 0.000]], [0.916, [0.874, 0.000, 0.000]], [0.918, [0.857, 0.000, 0.000]], [0.920, [0.857, 0.000, 0.000]], [0.922, [0.839, 0.000, 0.000]], [0.924, [0.839, 0.000, 0.000]], [0.926, [0.821, 0.000, 0.000]], [0.928, [0.821, 0.000, 0.000]], [0.930, [0.803, 0.000, 0.000]], [0.932, [0.803, 0.000, 0.000]], [0.934, [0.785, 0.000, 0.000]], [0.936, [0.785, 0.000, 0.000]], [0.938, [0.767, 0.000, 0.000]], [0.940, [0.767, 0.000, 0.000]], [0.942, [0.750, 0.000, 0.000]], [0.944, [0.750, 0.000, 0.000]], [0.946, [0.732, 0.000, 0.000]], [0.948, [0.732, 0.000, 0.000]], [0.950, [0.714, 0.000, 0.000]], [0.952, [0.714, 0.000, 0.000]], [0.954, [0.696, 0.000, 0.000]], [0.956, [0.696, 0.000, 0.000]], [0.958, [0.678, 0.000, 0.000]], [0.960, [0.678, 0.000, 0.000]], [0.962, [0.660, 0.000, 0.000]], [0.964, [0.660, 0.000, 0.000]], [0.966, [0.643, 0.000, 0.000]], [0.968, [0.643, 0.000, 0.000]], [0.970, [0.625, 0.000, 0.000]], [0.972, [0.625, 0.000, 0.000]], [0.974, [0.607, 0.000, 0.000]], [0.976, [0.607, 0.000, 0.000]], [0.978, [0.589, 0.000, 0.000]], [0.980, [0.589, 0.000, 0.000]], [0.982, [0.571, 0.000, 0.000]], [0.984, [0.571, 0.000, 0.000]], [0.986, [0.553, 0.000, 0.000]], [0.988, [0.553, 0.000, 0.000]], [0.990, [0.536, 0.000, 0.000]], [0.992, [0.536, 0.000, 0.000]], [0.994, [0.518, 0.000, 0.000]], [0.996, [0.518, 0.000, 0.000]], [0.998, [0.500, 0.000, 0.000]], [1.000, [0.500, 0.000, 0.000]]];

const aveDeg = d => d['edges'] / d['vertices'] * 2;
const density = d => d['vertices'] === 1 ? 0 : aveDeg(d) / (d['vertices'] - 1);
const curve = (val, factor) => 1 - Math.log(val * (1 - factor) + factor) / Math.log(factor);


const speedometerLine = (srcPos, vPos, xPos, yPos, sizeSacle) => d3.line()([srcPos, [0, 0], vPos].map(pos => [pos[0] * sizeSacle + xPos, pos[1] * sizeSacle + yPos]));
const spiralLine = (posList, xPos, yPos, sizeSacle) => d3.line().curve(d3.curveBasisOpen)(posList.map(pos => [pos[0] * sizeSacle + xPos, pos[1] * sizeSacle + yPos]));
////////

function getLayerAllObj(layer_name) {
  let layer_all = {
    coords: [],
    colors: {},
    shapes: [],
    voronoi: [],
    V: 0,
    E: 0
  };
  return layer_all;
}

function getLayerTrackingObj(layer_name) {
  let layer_tracking = {
    ready_to_move: false,
    ready_to_color: false
  };
  return layer_tracking;
}

// add a new floor shape to a given building
function addNewFloor(city_all, layer_name, h, ground_r, inner_r, outer_r) {
  let floor = {
    height: h,
    ground_radius: ground_r,
    inner_radius: inner_r,
    outer_radius: outer_r
  }
  city_all[layer_name].shapes.push(floor);
  return { all: city_all };
}

// take layer name and lines from floor file, update the shape of building
function loadFloor(lines, layer_name, city_all, city_tracking) {
  // console.log("loadFloor: "+layer_name);
  if (!(layer_name in city_all)) {
    city_all[layer_name] = getLayerAllObj(layer_name);
  } else if (!(layer_name in city_all)) {
    city_all[layer_name] = getLayerTrackingObj(layer_name);
  }
  let i;
  let tmp_ground_radius = 0;
  let tmp_inner_radius = 0;

  for (i = 0; i < lines.length; i++) {
    let elements = lines[i].split(' ');
    // console.log("loadFloor: floor "+i);
    // console.log(elements);
    if (elements.length === 4) {
      if (i % 3 == 0) {
        if (elements[0] === "0") {
          let result = addNewFloor(city_all, layer_name, 0.0, 0.0, 0.0, 0.0);
          city_all = result.all;
        };
        // console.log("loadFloor: add new floor "+city_all[layer_name].shapes.length);
        tmp_ground_radius = elements[2];
      } else if (i % 3 === 1) {
        tmp_inner_radius = elements[2];
      } else if (i % 3 === 2) {
        // console.log("loadFloor: add new floor "+city_all[layer_name].shapes.length);
        // console.log("loadFloor: add new floor "+elements[0]+' '+elements[1]+' '+elements[2]+' '+tmp_outer_radius);
        let result = addNewFloor(city_all, layer_name, parseFloat(elements[1]), parseFloat(tmp_ground_radius), parseFloat(tmp_inner_radius), parseFloat(elements[2]));
        city_all = result.all;
      };
    }
  }
  city_all[layer_name].b_value = lines[lines.length - 1];
  // shape of building is ready, check if coordinates is ready
  if (city_all[layer_name].coords.length > 0) {
    city_tracking[layer_name].ready_to_move = true;
  }
  // printGlobalDict("loadFloor");
  return { all: city_all, tracking: city_tracking };
}

// take color file of a layer and save information to global dictionary
function loadColor(color_list, layer_name, city_all, city_tracking) {
  // console.log("loadColor: " +layer_name);
  if (!(layer_name in city_all)) {
    city_all[layer_name] = getLayerAllObj(layer_name);
  }
  if (!(layer_name in city_tracking)) {
    city_tracking[layer_name] = getLayerTrackingObj(layer_name);
  }
  // inner structure of colors in layer_all dictionary
  let color_dict = {
    ground: [],
    inner: [],
    outer: [],
    next: [],
    ceil: []
  };
  // read lines from a color file into "colors" dictionary
  let i;
  for (i = 0; i < color_list.length; i++) {
    let elements = color_list[i].split(' ');
    let rgb = {
      r: parseFloat(elements[3]),
      g: parseFloat(elements[4]),
      b: parseFloat(elements[5])
    };
    if (color_list[i].search("ground") > 0) {
      color_dict.ground.push(rgb);
    } else if (color_list[i].search("inner") > 0) {
      color_dict.inner.push(rgb);
    } else if (color_list[i].search("outer") > 0) {
      color_dict.outer.push(rgb);
    } else if (color_list[i].search("next") > 0) {
      color_dict.next.push(rgb);
    } else if (color_list[i].search("ceil") > 0) {
      color_dict.ceil.push(rgb);
    }
  }
  city_all[layer_name].colors = color_dict;
  city_tracking[layer_name].ready_to_color = true;
  // printGlobalDict("loadColor");
  return { all: city_all, tracking: city_tracking };
}

function loadSpiral(scene, lines, city_all, grass_objects, bush_objects, city_tracking, x_scale, glyphBack_objects, buildingTexture) {
  // console.log("loading spiral");
  // console.log(filename);
  let city_to_load = (lines.length - 1) / 2;
  console.log("city_to_load = " + city_to_load);
  let building_with_grass = [];
  for (let i = 0; i < lines.length - 1; i++) {
    let elements = lines[i].split(' ');
    let layer_name = elements[0];
    //update global dictionaries if new layer appears
    if (!(layer_name in city_tracking)) {
      city_tracking[layer_name] = getLayerTrackingObj(layer_name);
      // console.log("loadSpiral: update city_tracking of "+layer_name);
    }
    if (!(layer_name in city_all)) {
      city_all[layer_name] = getLayerAllObj(layer_name);
    }
    city_all[layer_name].coords = [elements[1] / x_scale, elements[2] / x_scale, elements[3]]; /* X, Z, rotation */
    //grass
    // let F = parseInt(layer_name.split('_').pop()); /* # of fixed points represented by selected building */
    let F = parseInt(elements[10]);
    if (F > 1) {
      building_with_grass.push(layer_name.slice(layer_name.indexOf('_') + 1, layer_name.length));
      let grassRadius = parseFloat(elements[4]);
      let grassFace = Math.log2(8 * (F - 1));
      let grassGeo = new THREE.CylinderBufferGeometry(grassRadius, grassRadius, 0.2, grassFace);
      grassGeo.translate(city_all[layer_name].coords[0], 0, city_all[layer_name].coords[1]);
      let grassMat = new THREE.MeshStandardMaterial({ color: 0x7cfc00 });
      let grassMesh = new THREE.Mesh(grassGeo, grassMat);
      scene.add(grassMesh);
      grass_objects.push(grassMesh);

      const vicinityMesh = new THREE.Mesh(new THREE.BoxBufferGeometry(grassRadius / 2, 0.2, grassRadius / 2), buildingTexture.vicinity);
      vicinityMesh.position.x = city_all[layer_name].coords[0],
      vicinityMesh.position.y = 0.1,
      vicinityMesh.position.z = city_all[layer_name].coords[1] + grassRadius * 3 / 4,
      vicinityMesh.layerName = layer_name;
      scene.add(vicinityMesh);
      glyphBack_objects.push(vicinityMesh);

      let x_z = [city_all[layer_name].coords[0], city_all[layer_name].coords[1]];
      let layer_name_end = layer_name.lastIndexOf('_');
      let simplified_layer_name = layer_name.slice(8, layer_name_end);
      let result = BUSH.createBushMeshes(scene, bush_objects, simplified_layer_name, x_z, grassFace, grassRadius);
      bush_objects = result.bush;
    }

    // flag
    city_all[layer_name].V = parseInt(elements[5]);
    city_all[layer_name].E = parseInt(elements[6]);
    city_all[layer_name]['fragNum'] = parseInt(elements[7]);
    city_all[layer_name]['fragNeg'] = parseInt(elements[8]);
    city_all[layer_name]['fragPos'] = parseInt(elements[9]);
    city_all[layer_name]['bushSize'] = parseInt(elements[10]);
    city_all[layer_name]['duplicate'] = parseInt(elements[11]);

    i++;

    city_all[layer_name]['fragBucket'] = lines[i].split(' ').map(x => parseInt(x, 10));

    city_all[layer_name]['spiralIdx'] = i / 2;

    // coordinates is ready, check if shape of building is ready
    if (city_all[layer_name].shapes.length > 0) {
      city_tracking[layer_name].ready_to_move = true;
    }
  }
  // console.log(building_with_grass);
  return { all: city_all, tracking: city_tracking, grass: grass_objects, bush: bush_objects, city_count: city_to_load, glyphBack_objects: glyphBack_objects };
}

function loadSpiral_dagType(scene, lines, city_all, grass_objects, bush_objects, city_tracking, x_scale, glyphBack_objects, buildingTexture, vicinityTHList) {
  // console.log("loading spiral");
  // console.log(filename);
  let city_to_load = (lines.length - 1) / 2;
  console.log("city_to_load = " + city_to_load);
  let building_with_grass = [];
  for (let i = 0; i < lines.length - 1; i++) {
    let elements = lines[i].split(' ');
    let layer_name = elements[0];
    //update global dictionaries if new layer appears
    if (!(layer_name in city_tracking)) {
      city_tracking[layer_name] = getLayerTrackingObj(layer_name);
      // console.log("loadSpiral: update city_tracking of "+layer_name);
    }
    if (!(layer_name in city_all)) {
      city_all[layer_name] = getLayerAllObj(layer_name);
    }
    city_all[layer_name].coords = [elements[1] / x_scale, elements[2] / x_scale, elements[3]]; /* X, Z, rotation */
    //grass
    // let F = parseInt(layer_name.split('_').pop()); /* # of fixed points represented by selected building */
    let F = parseInt(elements[10]);
    if (F > 1) {
      building_with_grass.push(layer_name.slice(layer_name.indexOf('_') + 1, layer_name.length));
      let grassRadius = parseFloat(elements[4]);
      let grassFace = Math.log2(8 * (F - 1));
      let grassGeo = new THREE.CylinderBufferGeometry(grassRadius, grassRadius, 0.2, grassFace);
      grassGeo.translate(city_all[layer_name].coords[0], 0, city_all[layer_name].coords[1]);
      let grassMat = new THREE.MeshStandardMaterial({ color: 0x7cfc00 });
      let grassMesh = new THREE.Mesh(grassGeo, grassMat);
      scene.add(grassMesh);
      grass_objects.push(grassMesh);

      const bucketSize = elements.length > 15 ? parseInt(elements[15]) : undefined;
      let vicinityTexture;
      if (bucketSize <= vicinityTHList[0]) {
        vicinityTexture = buildingTexture.strata;
      } else if (bucketSize <= vicinityTHList[1]) {
        vicinityTexture = buildingTexture.fpviewer;
      } else {
        vicinityTexture = buildingTexture.vicinity;
      }

      const vicinityMesh = new THREE.Mesh(new THREE.BoxBufferGeometry(grassRadius / 2, 0.2, grassRadius / 2), vicinityTexture);
      vicinityMesh.position.x = city_all[layer_name].coords[0],
      vicinityMesh.position.y = 0.1,
      vicinityMesh.position.z = city_all[layer_name].coords[1] + grassRadius / 2,
      vicinityMesh.layerName = layer_name;
      scene.add(vicinityMesh);
      glyphBack_objects.push(vicinityMesh);

      let x_z = [city_all[layer_name].coords[0], city_all[layer_name].coords[1]];
      let layer_name_end = layer_name.lastIndexOf('_');
      let simplified_layer_name = layer_name.slice(8, layer_name_end);
      let result = BUSH.createBushMeshes(scene, bush_objects, simplified_layer_name, x_z, grassFace, grassRadius);
      bush_objects = result.bush;
    }

    // flag
    city_all[layer_name].V = parseInt(elements[5]);
    city_all[layer_name].E = parseInt(elements[6]);
    city_all[layer_name]['fragNum'] = parseInt(elements[7]);
    city_all[layer_name]['fragNeg'] = parseInt(elements[8]);
    city_all[layer_name]['fragPos'] = parseInt(elements[9]);
    city_all[layer_name]['bushSize'] = parseInt(elements[10]);
    city_all[layer_name]['duplicate'] = parseInt(elements[11]);
    city_all[layer_name]['dagType'] = parseInt(elements[12]);
    city_all[layer_name]['mallVicinityNum'] = elements.length > 13 ? parseInt(elements[13]) : undefined;
    city_all[layer_name]['largeNum'] = elements.length > 14 ? parseInt(elements[14]) : undefined;

    i++;

    city_all[layer_name]['fragBucket'] = lines[i].split(' ').map(x => parseInt(x, 10));

    city_all[layer_name]['spiralIdx'] = i / 2;

    // coordinates is ready, check if shape of building is ready
    if (city_all[layer_name].shapes.length > 0) {
      city_tracking[layer_name].ready_to_move = true;
    }
  }
  // console.log(building_with_grass);
  return { all: city_all, tracking: city_tracking, grass: grass_objects, bush: bush_objects, city_count: city_to_load, glyphBack_objects: glyphBack_objects };
}

function loadVoronoi(city_all, lines, filename) {
  for (let i = 0; i < lines.length - 1; i++) {
    let elements = lines[i].split(' ');
    let layer_name = elements[0];
    let voronoi = [];
    for (let j = 1; j < elements.length; j = j + 2) {
      let voronoi_vertex = [elements[j], elements[j + 1]];
      voronoi.push(voronoi_vertex);
    }
    city_all[layer_name].voronoi = voronoi;
    // console.log("loadVoronoi: "+layer_name+".voronoi "+city_all[layer_name].voronoi);
  }
  return { all: city_all };
}


function colorToHex(c) {
  let hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

// RGB in [0,255]
function rgbToHex(r, g, b) {
  return parseInt("0x" + colorToHex(r) + colorToHex(g) + colorToHex(b));
}

//given a normalized vector, compute the Euler angles of rotation for bars in truss structure
function rotateTruss(b) {
  let i, j;
  let a = [0, 1, 0];
  b[0] = -b[0];
  b[2] = -b[2];
  let v = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  let c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  let I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  let v_matrix = [[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]];
  let v_matrix_2 = [[-v[2] * v[2] - v[1] * v[1], v[0] * v[1], v[0] * v[2]], [v[0] * v[1], -v[0] * v[0] - v[2] * v[2], v[1] * v[2]], [v[0] * v[2], v[1] * v[2], -v[0] * v[0] - v[1] * v[1]]];
  let R = [];
  if (c == -1) {
    for (j = 0; j < 3; j++) {
      let line = [];
      for (i = 0; i < 3; i++) {
        line.push(I[i][j] + v_matrix[i][j] + v_matrix_2[i][j]);
      }
      R.push(line);
    }
  } else {
    for (j = 0; j < 3; j++) {
      let line = [];
      for (i = 0; i < 3; i++) {
        line.push(I[i][j] + v_matrix[i][j] + v_matrix_2[i][j] / (1 + c));
      }
      R.push(line);
    }
  }
  let sy = Math.sqrt(R[0][0] * R[0][0] + R[1][0] * R[1][0]);
  // https://www.learnopencv.com/rotation-matrix-to-euler-angles/
  let singular = sy < 1e-8;
  let x, y, z;
  if (!singular) {
    x = Math.atan2(R[2][1], R[2][2]);
    y = Math.atan2(-R[2][0], sy);
    z = Math.atan2(R[1][0], R[0][0]);
  } else {
    x = Math.atan2(-R[1][2], R[1][1]);
    y = Math.atan2(-R[2][0], sy);
    z = 0;
  }
  let rotate_rad = [x, y, z];
  return rotate_rad;
}

function mag(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function normalize(v) {
  let length = mag(v);
  let i;
  let normalized = [];
  for (i = 0; i < 3; i++) {
    normalized.push(v[i] / length);
  }
  return normalized;
}

function addTruss(scene, truss_objects, window_objects, h, center, top_radius, btm_radius, top_in_radius, height, r, g, b, isNight) {
  let torus_thickness = 0.1, bar_thickness = 0.1;
  let number = 6;
  let color = rgbToHex(r, g, b);
  let bars_geo = new THREE.Geometry();
  let material = new THREE.MeshStandardMaterial({ color: color });
  let i;
  for (i = 0; i < number; i++) {
    let theta = i * (360 / number);
    let theta_sin = Math.sin(theta * Math.PI / 180);
    let theta_cos = Math.cos(theta * Math.PI / 180);
    let bar_top_radius = top_radius + torus_thickness;
    let bar_btm_radius = btm_radius + torus_thickness;
    let top = [theta_cos * bar_top_radius, height / 2, theta_sin * bar_top_radius];
    let btm = [theta_cos * bar_btm_radius, -height / 2, theta_sin * bar_btm_radius];
    let top_btm = [top[0] - btm[0], top[1] - btm[1], top[2] - btm[2]];
    let length = mag(top_btm);
    let normalized_top_btm = normalize(top_btm);
    let mid_radius = (top_radius + bar_btm_radius) / 2;
    let bar_center = [center[0] + theta_cos * mid_radius, center[1], center[2] + theta_sin * mid_radius];
    let bar = new THREE.CylinderGeometry(bar_thickness, bar_thickness, length, 8, 8);
    // rotate the side bars
    let rotated = rotateTruss(normalized_top_btm);
    bar.rotateX(rotated[0]);
    bar.rotateY(rotated[1]);
    bar.rotateZ(rotated[2]);
    bar.translate(bar_center[0], bar_center[1], bar_center[2]);
    bars_geo.merge(bar);
  }
  // create torus geometry
  let torus_geo = new THREE.TorusGeometry(top_radius, torus_thickness, 8, 30);
  torus_geo.rotateX(90 * Math.PI / 180);
  let torus_flat = new THREE.Geometry();
  torus_flat.merge(torus_geo);
  torus_flat.translate(center[0], center[1] + height / 2, center[2]);
  bars_geo.merge(torus_flat);
  // convert truss geo to buffer geometry and add to scene
  let truss_buffer_geo = new THREE.BufferGeometry().fromGeometry(bars_geo);
  let bar_mesh = new THREE.Mesh(truss_buffer_geo, material);
  bar_mesh.updateMatrix();
  scene.add(bar_mesh);
  truss_objects.push(bar_mesh);
  // night version windows
  let theta_start_1 = [0.5, -1.5, 2.6], theta_start_2 = [1.6, -0.5, 3.7];
  let j;
  let window;
  let windows_geo = new THREE.Geometry();
  if (h % 2 === 0) {
    for (j = 0; j < 3; j++) {
      window = new THREE.CylinderGeometry(top_in_radius + torus_thickness, btm_radius + torus_thickness, height, 18, 8, true, theta_start_1[j], 2 * Math.PI / 6);
      windows_geo.merge(window);
    }
  } else if (h % 2 !== 0) {
    for (j = 0; j < 3; j++) {
      window = new THREE.CylinderGeometry(top_in_radius + torus_thickness, btm_radius + torus_thickness, height, 18, 8, true, theta_start_2[j], 2 * Math.PI / 6);
      windows_geo.merge(window);
    }
  }
  windows_geo.translate(center[0], center[1], center[2]);
  let windows_buffer_geo = new THREE.BufferGeometry().fromGeometry(windows_geo);
  let emissive_material = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 1 });
  let window_mesh = new THREE.Mesh(windows_buffer_geo, emissive_material);
  window_objects.push(window_mesh);
  scene.add(window_mesh);
  if (!isNight) { window_objects.forEach(object => object.visible = false); }
  return { scene: scene, truss: truss_objects, window: window_objects };
}

function createFlags(scene, height, coord, base_Y, layer, V, E, fragNum, fragNeg, fragPos, fragBucket, duplicate, flag_objects, lcc, peel, mast_scale, dataSet, flag_objects_new, glyphInfo, glyphFactors, bushSize, glyph_objects, glyphBack_objects, lighthouseColor, dagType, buildingTexture, mallVicinityNum, largeNum) {
  let loadFlagTexture = true;
  const font = buildingTexture.font;
  // console.log("coord of flag", fixed_point_number, "is", coord, "height of flag is", base_Y);
  let X = coord[0], Z = coord[1];
  let flag_width = Math.log(V), flag_height = Math.log(E), flag_thickness = 0.5;
  let mast_radius = Math.sqrt((1 + fragNeg + fragPos) / 4);
  let mast_length = mast_scale * Math.log(fragNum + 1) / Math.pow(mast_radius, 2) / 8;

  let flag_mesh;

  if (loadFlagTexture) {
    // add text to flag
    // if (bushSize == 1) {
    if (glyphInfo.hasOwnProperty('circle')) {
      flag_mesh = new THREE.Mesh(new THREE.BoxBufferGeometry(flag_width, flag_height, flag_thickness), new THREE.MeshStandardMaterial({ color: 0xffffff }));

      // let loader = new THREE.FontLoader();
      // loader.load('../textures/helvetiker_regular.typeface.json', function (font) {
      // console.log("font loaded!");

      let text_geo = new THREE.Geometry();
      let fp_text_geo = new THREE.Geometry();
      // let peel_geo = new THREE.TextGeometry( peel.toString(), {
      //   font: font,
      //   size: flag_width/peel.toString().length,
      //   height: flag_thickness/2+0.15
      // } );
      // if(peel.toString().length > 1){
      //   peel_geo.translate(X+flag_height/16,base_Y+mast_length+flag_height/2,Z);
      //   console.log(peel);
      // }else{
      //   peel_geo.translate(X+flag_height/16,base_Y+mast_length,Z);
      // }
      // console.log("text size: "+flag_width/peel.toString().length);
      // console.log("text height: "+flag_thickness/2+0.15);

      // console.log("building.js::createFlags - V = "+V.toString()+", E = "+E.toString()+", # of floors = "+height.toString());
      let text_size = flag_height / 4;
      let text_height = flag_thickness / 2 + 0.15;
      let height_offset = flag_height / 32;
      let V_e = V.toExponential(2);
      let E_e = E.toExponential(2);
      let V_E_size = flag_width / (Math.max(V_e.length, E_e.toString().length));
      let peel_geo = new THREE.TextGeometry("Peel: " + peel.toString(), { font: font, size: flag_width / (peel.toString().length + 5), height: text_height });
      peel_geo.translate(X + height_offset, base_Y + mast_length + height_offset, Z);
      let V_geo = new THREE.TextGeometry("V: " + V_e, { font: font, size: V_E_size, height: text_height });
      V_geo.translate(X, base_Y + mast_length + flag_height / 4 + 2 * height_offset, Z);
      let E_geo = new THREE.TextGeometry("E: " + E_e, { font: font, size: V_E_size, height: text_height });
      E_geo.translate(X, base_Y + mast_length + 2 * flag_height / 4 + height_offset, Z);
      let height_geo = new THREE.TextGeometry(height.toString() + " Floors", { font: font, size: flag_width / (height.toString().length + 7), height: text_height });
      height_geo.translate(X + height_offset, base_Y + mast_length + 3 * flag_height / 4, Z);

      fp_text_geo.merge(peel_geo);
      let fp_text_buffer_geo = new THREE.BufferGeometry().fromGeometry(fp_text_geo);
      let fp_text_mesh = new THREE.Mesh(fp_text_buffer_geo, new THREE.MeshStandardMaterial({ color: lighthouseColor }));

      text_geo.merge(V_geo);
      text_geo.merge(E_geo);
      text_geo.merge(height_geo);
      let text_buffer_geo = new THREE.BufferGeometry().fromGeometry(text_geo);
      let text_mesh = new THREE.Mesh(text_buffer_geo, new THREE.MeshStandardMaterial({ color: 0x000000 }));

      let duplicate_geo;
      if (duplicate === 1) {
        duplicate_geo = new THREE.Geometry();
      } else if (duplicate > 1) {
        duplicate_geo = new THREE.TextGeometry("Dup: " + duplicate.toString(), { font: font, size: flag_width / (duplicate.toString().length + 4), height: text_height });
      } else if (duplicate > 10000) {
        duplicate_geo = new THREE.TextGeometry("Dup: " + duplicate.toExponential(2), { font: font, size: flag_width / (duplicate.toExponential(2).length + 4), height: text_height });
      }

      duplicate_geo.rotateY(Math.PI);
      duplicate_geo.translate(X - height_offset + flag_width, base_Y + mast_length + 3 * flag_height / 4, Z);
      let duplicate_buffer_geo = new THREE.BufferGeometry().fromGeometry(duplicate_geo);
      let duplicate_mesh = new THREE.Mesh(duplicate_buffer_geo, new THREE.MeshStandardMaterial({ color: 0x000000 }));

      scene.add(text_mesh);
      flag_objects.push(text_mesh);
      scene.add(fp_text_mesh);
      flag_objects.push(fp_text_mesh);
      scene.add(duplicate_mesh);
      flag_objects.push(duplicate_mesh);


      const glyphGroup = new THREE.Group();
      // console.log(glyphInfo)

      // const glyphPath = spiralLine(glyphInfo.spiral.pos, 0, 0, flag_width / 6 * glyphFactors.size.spiral)
      const colorFactor = glyphFactors.color;
      // console.log(glyphInfo, layer)
      const glyphColor = d3.rgb(...interpolateLinearly(curve(density(glyphInfo.circle['lccList'][0]), colorFactor), grey2red).map(x => x * 255)).darker(1.25)
      const glyphCircleR = flag_width / 12 * glyphFactors.size.building.circle * Math.sqrt(Math.log(1 + glyphInfo.circle['lccList'][0]['edges']))

      const glyphCircleGeo = new THREE.CylinderGeometry(glyphCircleR, glyphCircleR, text_height, 32);
      glyphCircleGeo.rotateX(Math.PI / 2);
      glyphCircleGeo.translate(X + height_offset + flag_width * 5 / 6, base_Y + mast_length + flag_height - flag_width / 6, Z + text_height - flag_thickness / 2);
      const glyphCircleMesh = new THREE.Mesh(glyphCircleGeo, new THREE.MeshStandardMaterial({ color: glyphColor.formatHex() }))
      glyphGroup.add(glyphCircleMesh);


      // console.log(glyphInfo.dot)
      // for (const spikeInfo of Object.values(glyphInfo.dot)) {
      //   console.log(spikeInfo)
      //   const spikePath = speedometerLine(spikeInfo.info.srcPos, spikeInfo.info.vPos, 0, 0, flag_width / 2 * glyphFactors.size.building.dot)
      //   console.log(spikePath)
      // }

      // const $d3g = {};
      // d3threeD( $d3g );

      // const tempPath = $d3g.transformSVGPath(glyphPath)
      // // console.log(tempPath)
      // const tempShapes = tempPath.toShapes( true )

      // // const points = tempPath.getPoints();


      // // const geometry = new THREE.BufferGeometry().setFromPoints( points );
      // // const material = new THREE.LineBasicMaterial( { color: 0xffffff } );

      // // const line = new THREE.Line( geometry, material );
      // // scene.add( line );

      // const glyphGroup = new THREE.Group();

      // for (let shapeIdx = 0; shapeIdx < tempShapes.length; shapeIdx ++) {
      //   const tempShape = tempShapes[shapeIdx];
      //   const shapeGeo = new THREE.ExtrudeGeometry(tempShape, {depth: text_height, bevelEnabled: false})
      //   shapeGeo.translate(0, 0, -text_height);
      //   shapeGeo.rotateX(Math.PI)
      //   shapeGeo.translate(X + height_offset + flag_width * 5 / 6, base_Y + mast_length + flag_height - flag_width / 6, Z);
      //   const shapeMesh = new THREE.Mesh(shapeGeo, new THREE.MeshStandardMaterial({ color: glyphColor.formatHex() }))

      //   glyphGroup.add(shapeMesh);
      // }
      glyphCircleMesh.layerName = layer;
      scene.add(glyphCircleMesh);
      glyph_objects.push(glyphCircleMesh);
      // });


      // console.log(dagType)
      const xOffset = X + height_offset;
      const yOffset = base_Y + mast_length + flag_height - flag_width / 8 / 4 * 3;
      const zOffset =  Z + text_height - flag_thickness / 2;
      let svgGroup;
      let animalMesh;

      if (dagType === 0) {
        // console.log('bird')
        svgGroup = extrudeSVG(buildingTexture.rawDag, text_height);
        animalMesh = new THREE.Mesh(new THREE.BoxBufferGeometry(flag_width / 10, flag_width / 10, text_height), buildingTexture.bird);
        // console.log(animalMesh)
      } else if (dagType === 1) {
        // console.log('horse')
        svgGroup = extrudeSVG(buildingTexture.edgeCutDag, text_height);
        animalMesh = new THREE.Mesh(new THREE.BoxBufferGeometry(flag_width / 10, flag_width / 10, text_height), buildingTexture.horse);
        // console.log(animalMesh)
      } else if (dagType === 2) {
        // console.log('gorilla')
        svgGroup = extrudeSVG(buildingTexture.waveDag, text_height);
        // console.log(svgGroup.scale)
        // console.log(buildingTexture.gorilla)
        // console.log(new THREE.MeshStandardMaterial({ color: 0x000000 }))
        animalMesh = new THREE.Mesh(new THREE.BoxBufferGeometry(flag_width / 10, flag_width / 10, text_height), buildingTexture.gorilla);
        // console.log(animalMesh)
        // scene.add(animalMesh);
      }
      if (svgGroup) {
        svgGroup.scale.set(flag_width / 8 / 320, flag_width / 8 / 320, 1)
        svgGroup.position.x = xOffset;
        svgGroup.position.y = yOffset;
        svgGroup.position.z = zOffset;
        scene.add(svgGroup);
      }
      if (animalMesh) {
        animalMesh.position.x = xOffset + flag_width / 6 + flag_width / 24;
        animalMesh.position.y = yOffset + flag_width / 24;
        animalMesh.position.z = zOffset;
        scene.add(animalMesh);
      }

      if (mallVicinityNum > 0) {
        const dangerMesh = new THREE.Mesh(new THREE.BoxBufferGeometry(flag_width / 10, flag_width / 10, text_height), buildingTexture.mall);
        dangerMesh.position.x = xOffset + flag_width / 3 + flag_width / 24;
        dangerMesh.position.y = yOffset + flag_width / 24;
        dangerMesh.position.z = zOffset;
        scene.add(dangerMesh);
      }

      if (mallVicinityNum > 0 || largeNum > 0) {
        const dangerMesh = new THREE.Mesh(new THREE.BoxBufferGeometry(flag_width / 10, flag_width / 10, text_height), buildingTexture.danger);
        dangerMesh.position.x = xOffset + flag_width / 2 + flag_width / 24;
        dangerMesh.position.y = yOffset + flag_width / 24;
        dangerMesh.position.z = zOffset;
        scene.add(dangerMesh);
      }

    }
    // else if (bushSize > 1) {
    else if (glyphInfo.hasOwnProperty('spiral')) {
      // let texture_url = "../../textures/plots/"+dataSet+'_'+layer.slice(layer.indexOf('_')+1,layer.lastIndexOf('_'))+'.png';
      // // console.log(texture_url);
      // let url_exists = ifUrlExists(texture_url);
      // let flag_material;
      // if(url_exists){
      //   let flag_texture = new THREE.TextureLoader().load(texture_url);
      //   flag_material = new THREE.MeshStandardMaterial( {map:flag_texture} );
      // }else{
      //   flag_material = new THREE.MeshBasicMaterial({color:"white"});
      // } 
      // flag_mesh = new THREE.Mesh( new THREE.BoxBufferGeometry(flag_width,flag_height,flag_thickness), flag_material);
      flag_mesh = new THREE.Mesh(new THREE.BoxBufferGeometry(flag_width, flag_height, flag_thickness), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      // let loader = new THREE.FontLoader();
      // loader.load('../textures/helvetiker_regular.typeface.json', function (font) {
      // console.log("font loaded!");

      let text_geo = new THREE.Geometry();
      let fp_text_geo = new THREE.Geometry();
      // let peel_geo = new THREE.TextGeometry( peel.toString(), {
      //   font: font,
      //   size: flag_width/peel.toString().length,
      //   height: flag_thickness/2+0.15
      // } );
      // if(peel.toString().length > 1){
      //   peel_geo.translate(X+flag_height/16,base_Y+mast_length+flag_height/2,Z);
      //   console.log(peel);
      // }else{
      //   peel_geo.translate(X+flag_height/16,base_Y+mast_length,Z);
      // }
      // console.log("text size: "+flag_width/peel.toString().length);
      // console.log("text height: "+flag_thickness/2+0.15);

      // console.log("building.js::createFlags - V = "+V.toString()+", E = "+E.toString()+", # of floors = "+height.toString());
      let text_size = flag_height / 4;
      let text_height = flag_thickness / 2 + 0.15;
      let height_offset = flag_height / 32;
      let V_e = V.toExponential(2);
      let E_e = E.toExponential(2);
      let V_E_size = flag_width / (Math.max(V_e.length, E_e.toString().length));
      let peel_geo = new THREE.TextGeometry("Peel: " + peel.toString(), { font: font, size: flag_width / (peel.toString().length + 5), height: text_height });
      peel_geo.translate(X + height_offset, base_Y + mast_length + height_offset, Z);
      let V_geo = new THREE.TextGeometry("V: " + V_e, { font: font, size: V_E_size, height: text_height });
      V_geo.translate(X, base_Y + mast_length + flag_height / 4 + 2 * height_offset, Z);
      let E_geo = new THREE.TextGeometry("E: " + E_e, { font: font, size: V_E_size, height: text_height });
      E_geo.translate(X, base_Y + mast_length + 2 * flag_height / 4 + height_offset, Z);
      let height_geo = new THREE.TextGeometry(height.toString() + " Floors", { font: font, size: flag_width / (height.toString().length + 7), height: text_height });
      height_geo.translate(X + height_offset, base_Y + mast_length + 3 * flag_height / 4, Z);

      fp_text_geo.merge(peel_geo);
      let fp_text_buffer_geo = new THREE.BufferGeometry().fromGeometry(fp_text_geo);
      let fp_text_mesh = new THREE.Mesh(fp_text_buffer_geo, new THREE.MeshStandardMaterial({ color: lighthouseColor }));

      text_geo.merge(V_geo);
      text_geo.merge(E_geo);
      text_geo.merge(height_geo);
      let text_buffer_geo = new THREE.BufferGeometry().fromGeometry(text_geo);
      let text_mesh = new THREE.Mesh(text_buffer_geo, new THREE.MeshStandardMaterial({ color: 0x000000 }));

      let duplicate_geo;
      if (duplicate === 1) {
        duplicate_geo = new THREE.Geometry();
      } else if (duplicate > 1) {
        duplicate_geo = new THREE.TextGeometry("Dup: " + duplicate.toString(), { font: font, size: flag_width / (duplicate.toString().length + 4), height: text_height });
      } else if (duplicate > 10000) {
        duplicate_geo = new THREE.TextGeometry("Dup: " + duplicate.toExponential(2), { font: font, size: flag_width / (duplicate.toExponential(2).length + 4), height: text_height });
      }

      duplicate_geo.rotateY(Math.PI);
      duplicate_geo.translate(X - height_offset + flag_width, base_Y + mast_length + 3 * flag_height / 4, Z);
      let duplicate_buffer_geo = new THREE.BufferGeometry().fromGeometry(duplicate_geo);
      let duplicate_mesh = new THREE.Mesh(duplicate_buffer_geo, new THREE.MeshStandardMaterial({ color: 0x000000 }));

      scene.add(text_mesh);
      flag_objects.push(text_mesh);
      scene.add(fp_text_mesh);
      flag_objects.push(fp_text_mesh);
      scene.add(duplicate_mesh);
      flag_objects.push(duplicate_mesh);


      const glyphGroup = new THREE.Group();
      // console.log(glyphInfo);
      // console.log(glyphFactors)
      const glyphPath = spiralLine(glyphInfo.spiral.pos, 0, 0, flag_width / 6 * glyphFactors.size.spiral)
      // const glyphPath = spiralLine(glyphInfo.spiral.pos, 0, 0, 1)
      const colorFactor = glyphFactors.color;
      const glyphColor = d3.rgb(...interpolateLinearly(curve(density(glyphInfo.spiral), colorFactor), grey2red).map(x => x * 255)).darker(1.25)


      // console.log(glyphPath)
      // const svgLoader = new SVGLoader()
      // const svgData = loader.parse(glyphPath)
      // console.log(svgData.paths)

      const $d3g = {};
      d3threeD($d3g);

      const tempPath = $d3g.transformSVGPath(glyphPath)
      // console.log(tempPath)
      const tempShapes = tempPath.toShapes(true)

      // const points = tempPath.getPoints();

      // const geometry = new THREE.BufferGeometry().setFromPoints( points );
      // const material = new THREE.LineBasicMaterial( { color: 0xffffff } );

      // const line = new THREE.Line( geometry, material );
      // scene.add( line );

      for (let shapeIdx = 0; shapeIdx < tempShapes.length; shapeIdx++) {
        const tempShape = tempShapes[shapeIdx];
        const shapeGeo = new THREE.ExtrudeGeometry(tempShape, { depth: text_height, bevelEnabled: false })
        shapeGeo.translate(0, 0, -text_height);
        shapeGeo.rotateX(Math.PI)
        shapeGeo.translate(X + height_offset + flag_width * 5 / 6, base_Y + mast_length + flag_height - flag_width / 6, Z);
        const shapeMesh = new THREE.Mesh(shapeGeo, new THREE.MeshStandardMaterial({ color: glyphColor.formatHex() }))

        // glyphGroup.add(shapeMesh);
        shapeMesh.layerName = layer;
        scene.add(shapeMesh);
        glyph_objects.push(shapeMesh);
      }
      // glyphGroup.layerName = layer;
      // scene.add(glyphGroup);
      // glyph_objects.push(glyphGroup);

      // const svgMarkup = document.getElementById(`spiralDot_${glyphInfo.spiral.layer}_${glyphInfo.spiral.bucket}`).outerHTML;
      // console.log(svgMarkup);
      // const svgLoader = new SVGLoader()
      // const svgData = svgLoader.parse(svgMarkup);

      // console.log(svgData)
      // console.log(svgData.paths)

      // // svgData.paths.forEach((tempPath, i) => {
      // //   console.log(tempPath);
      // //   const shapes = tempPath.toShapes(true);

      // //   shapes.forEach((shape, j) => {
      // //     const shapeGeo = new THREE.ExtrudeGeometry(shape, {depth: 0.1, bevelEnabled: false});
      // //     shapeGeo.translate(X + height_offset, base_Y + mast_length + 3 * flag_height / 4, Z);
      // //     const shapeMesh = new THREE.Mesh(shapeGeo, new THREE.MeshStandardMaterial({ color: 0x000000 }));
      // //     scene.add(shapeMesh);
      // //   });

      // // })

      // console.log(svgData.paths[0])

      const backPath = spiralLine(glyphInfo.spiral.pos, 0, 0, flag_width / 2 * glyphFactors.size.spiral)
      // const backPath = spiralLine(glyphInfo.spiral.pos, 0, 0, 1)

      const tempBackPath = $d3g.transformSVGPath(backPath)
      // console.log(tempPath)
      const tempBackShapes = tempBackPath.toShapes(true)

      // if (layer === 'wavemap_3_47317_1') {
      //   console.log(backPath)
      //   console.log(tempBackShapes.length)
      // }

      for (let shapeIdx = 0; shapeIdx < tempBackShapes.length; shapeIdx++) {
        const tempBackShape = tempBackShapes[shapeIdx];
        const shapeGeo = new THREE.ExtrudeGeometry(tempBackShape, { depth: text_height, bevelEnabled: false })
        shapeGeo.translate(0, 0, -text_height);
        shapeGeo.rotateX(Math.PI);
        shapeGeo.rotateY(Math.PI)
        shapeGeo.translate(X + height_offset + flag_width / 2, base_Y + mast_length + flag_width / 2, Z);
        const shapeMesh = new THREE.Mesh(shapeGeo, new THREE.MeshStandardMaterial({ color: glyphColor.formatHex() }))

        // glyphGroup.add(shapeMesh);
        shapeMesh.layerName = layer;
        scene.add(shapeMesh);
        glyphBack_objects.push(shapeMesh);
      }
      // });

      // console.log(dagType)
      const xOffset = X + height_offset;
      const yOffset = base_Y + mast_length + flag_height - flag_width / 8 / 4 * 3;
      const zOffset =  Z + text_height - flag_thickness / 2;
      let svgGroup;
      let animalMesh;

      if (dagType === 0) {
        // console.log('bird')
        svgGroup = extrudeSVG(buildingTexture.rawDag, text_height);
        animalMesh = new THREE.Mesh(new THREE.BoxBufferGeometry(flag_width / 10, flag_width / 10, text_height), buildingTexture.bird);
        // console.log(animalMesh)
      } else if (dagType === 1) {
        // console.log('horse')
        svgGroup = extrudeSVG(buildingTexture.edgeCutDag, text_height);
        animalMesh = new THREE.Mesh(new THREE.BoxBufferGeometry(flag_width / 10, flag_width / 10, text_height), buildingTexture.horse);
        // console.log(animalMesh)
      } else if (dagType === 2) {
        // console.log('gorilla')
        svgGroup = extrudeSVG(buildingTexture.waveDag, text_height);
        // console.log(svgGroup.scale)
        animalMesh = new THREE.Mesh(new THREE.BoxBufferGeometry(flag_width / 10, flag_width / 10, text_height), buildingTexture.gorilla);
        // console.log(animalMesh)
      }
      if (svgGroup) {
        svgGroup.scale.set(flag_width / 8 / 320, flag_width / 8 / 320, 1)
        svgGroup.position.x = xOffset;
        svgGroup.position.y = yOffset;
        svgGroup.position.z = zOffset;
        scene.add(svgGroup);
      }
      if(animalMesh) {
        animalMesh.position.x = xOffset + flag_width / 6 + flag_width / 24;
        animalMesh.position.y = yOffset + flag_width / 24;
        animalMesh.position.z = zOffset;
        scene.add(animalMesh);
      }

      if (mallVicinityNum > 0) {
        const dangerMesh = new THREE.Mesh(new THREE.BoxBufferGeometry(flag_width / 10, flag_width / 10, text_height), buildingTexture.danger);
        dangerMesh.position.x = xOffset + flag_width / 3 + flag_width / 24;
        dangerMesh.position.y = yOffset + flag_width / 24;
        dangerMesh.position.z = zOffset;
        scene.add(dangerMesh);
      }
    }
  }

  flag_mesh.translateX(X + flag_width / 2);
  flag_mesh.translateY(base_Y + mast_length + flag_height / 2);
  flag_mesh.translateZ(Z);
  let rod = new THREE.Mesh(new THREE.CylinderBufferGeometry(mast_radius, mast_radius, mast_length, 8), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
  rod.translateX(X);
  rod.translateY(base_Y + mast_length / 2);
  rod.translateZ(Z);

  scene.add(flag_mesh);
  scene.add(rod);
  flag_objects.push(flag_mesh);
  flag_objects_new[layer] = { flag_mesh: flag_mesh, flag_rod: rod };
  flag_objects.push(rod);

  for (let index = -1; index < fragBucket.length + 1; index++) {
    let fragdensity = 0;
    if (index === -1) {
      fragdensity = 0;
    } else {
      fragdensity = fragBucket[index] / fragNum;
    };
    const markerPos = mast_length * fragdensity;
    let markerSize = 0.05
    let marker_radius = mast_radius * (1 + 0.05 * (1 + Math.abs(index - fragNeg + 1)));
    let markerColor = 0x000000;
    if (index === fragNeg - 1) {
      markerSize = 0.025
      markerColor = 0xff0000;
    }
    let marker = new THREE.Mesh(new THREE.CylinderBufferGeometry(marker_radius, marker_radius, markerSize, 8), new THREE.MeshStandardMaterial({ color: markerColor }));
    marker.translateX(X);
    marker.translateY(base_Y + markerPos + markerSize / 2);
    marker.translateZ(Z);

    scene.add(marker);
    flag_objects.push(marker);
  }
  return { scene: scene, flag_mast: flag_height + mast_length, flags: flag_objects, flag_objects_new: flag_objects_new, glyph_objects: glyph_objects, glyphBack_objects: glyphBack_objects };
}

//check if url exists
function ifUrlExists(url) {
  var request;
  if (window.XMLHttpRequest)
    request = new XMLHttpRequest();
  else
    request = new ActiveXObject("Microsoft.XMLHTTP");
  request.open('GET', url, false);
  request.send(); // there will be a 'pause' here until the response to come.
  // the object request will be actually modified
  if (request.status === 404) {
    console.log("404 - Url Does Not Exist - " + url)
    return false;
  }
  return true;
}

// check city_tracking, create buildings that are ready to color & move
// delete colored and moved building from city_tracking
function createCityMeshes(scene, objects, city_all, city_tracking, ceil_objects, middle_objects, truss_objects, window_objects, flag_objects, flag_objects_new, arrow_objects, src_objects, tgt_objects, glyph_objects, glyphBack_objects, city_to_load, y_scale, dataSet, ceilVisible, isNight, oneBuilding = false, first_key_color_dict, buildingTexture) {
  for (let layer in city_tracking) {
    // console.log(city_tracking[layer].ready_to_move)
    // console.log(city_tracking[layer].ready_to_color)
    if (city_tracking[layer].ready_to_move && city_tracking[layer].ready_to_color) {
      let layer_shape = city_all[layer].shapes;
      let height = layer_shape.length;
      // translate in X,Z direction
      let X = city_all[layer].coords[0];
      let Z = city_all[layer].coords[1];
      if (oneBuilding) {
        X = 0;
        Z = 0;
      }
      // loop from bottom floor to top floor
      for (let h = 1; h < height; h++) {
        // translate in Y direction
        let Y = y_scale * (0.5 * layer_shape[h].height + 0.5 * layer_shape[h - 1].height);
        // create inner frustum geometry
        let top_in_r = layer_shape[h].inner_radius;
        let btm_in_r = layer_shape[h].ground_radius;
        let tall = y_scale * (layer_shape[h].height - layer_shape[h - 1].height);
        let floor = new THREE.CylinderBufferGeometry(top_in_r, btm_in_r, tall, 16, 16);
        floor.translate(X, Y, Z);
        // apply colors
        let r, g, b;
        try {
          r = parseInt(city_all[layer].colors.inner[h - 1].r * 255);
          g = parseInt(city_all[layer].colors.inner[h - 1].g * 255);
          b = parseInt(city_all[layer].colors.inner[h - 1].b * 255);
        } catch (err) {
          console.log(err.message + " " + layer);
        }
        // let material = new THREE.MeshStandardMaterial({color:rgbToHex(r,g,b),transparent:true,opacity:0.3});
        let material = new THREE.MeshStandardMaterial({ color: rgbToHex(r, g, b), opacity: 1.0, transparent: true });
        let frustum_mesh = new THREE.Mesh(floor, material);
        frustum_mesh.floor_name = h;
        frustum_mesh.layer_name = layer.substring(8);
        // draw inner frustums
        scene.add(frustum_mesh);
        middle_objects.push(frustum_mesh);
        objects.push(frustum_mesh);


        // draw ceil
        const ceil_size = 0.05;
        const ceilY = y_scale * layer_shape[h].height - ceil_size / 2;
        let ceil = new THREE.CylinderBufferGeometry(top_in_r, top_in_r, ceil_size, 16, 16);
        ceil.translate(X, ceilY, Z);

        r = parseInt(city_all[layer].colors.ceil[h - 1].r * 255);
        g = parseInt(city_all[layer].colors.ceil[h - 1].g * 255);
        b = parseInt(city_all[layer].colors.ceil[h - 1].b * 255);

        material = new THREE.MeshStandardMaterial({ color: rgbToHex(r, g, b) });
        frustum_mesh = new THREE.Mesh(ceil, material);
        frustum_mesh.visible = ceilVisible;

        scene.add(frustum_mesh);
        ceil_objects.push(frustum_mesh);

        // draw center frustums
        if (h < height - 1) {
          let top_nx_r = layer_shape[h + 1].ground_radius;
          let btm_nx_r = btm_in_r;
          let center = new THREE.CylinderBufferGeometry(top_nx_r, btm_nx_r, tall, 16, 16);
          center.translate(X, Y, Z);

          r = parseInt(city_all[layer].colors.next[h - 1].r * 255);
          g = parseInt(city_all[layer].colors.next[h - 1].g * 255);
          b = parseInt(city_all[layer].colors.next[h - 1].b * 255);

          material = new THREE.MeshStandardMaterial({ color: rgbToHex(r, g, b) });
          frustum_mesh = new THREE.Mesh(center, material);

          scene.add(frustum_mesh);
          objects.push(frustum_mesh);
        };

        // outer frustums
        //create outer frustum as truss structure
        let top_out_r = layer_shape[h].outer_radius;
        let btm_out_r = btm_in_r;
        r = parseInt(city_all[layer].colors.outer[h - 1].r * 255);
        g = parseInt(city_all[layer].colors.outer[h - 1].g * 255);
        b = parseInt(city_all[layer].colors.outer[h - 1].b * 255);
        let result = addTruss(scene, truss_objects, window_objects, h, [X, Y, Z], top_out_r, btm_out_r, top_in_r, tall, r, g, b, isNight);
        truss_objects = result.truss;
        window_objects = result.window;
        scene = result.scene;
      }
      let flag_base_Y = y_scale * layer_shape[height - 1].height;
      city_all[layer].coords[3] = flag_base_Y; // 2021-10-18: I am not sure what coords[2] is, so I just append after it.
      city_all[layer].floorSize = height - 1;
      let lcc = parseInt(layer.slice(layer.lastIndexOf('_') + 1)); // last
      let sliced = layer.slice(0, layer.lastIndexOf('_'));
      sliced = sliced.slice(0, sliced.lastIndexOf('_'));
      let fixed = parseInt(sliced.slice(sliced.lastIndexOf('_') + 1)); // third to last
      let mast_scale = y_scale;
      // let mast_length = mast_scale * height;
      let splitLayerName = layer.split('_');
      let layerShortName = `${splitLayerName[1]}_${splitLayerName[2]}`
      // console.log(city_all.glyphInfo, layerShortName, city_all[layer].bushSize)
      let result = createFlags(scene, height - 1, [X, Z], flag_base_Y, layer, city_all[layer].V, city_all[layer].E, city_all[layer].fragNum, city_all[layer].fragNeg, city_all[layer].fragPos, city_all[layer].fragBucket, city_all[layer].duplicate, flag_objects, lcc, fixed, mast_scale, dataSet, flag_objects_new, city_all.glyphInfo[layerShortName], city_all.glyphInfo.factors, city_all[layer].bushSize, glyph_objects, glyphBack_objects, first_key_color_dict[fixed], city_all[layer].dagType, buildingTexture, city_all[layer].mallVicinityNum, city_all[layer].largeNum);
      scene = result.scene;
      flag_objects_new = result.flag_objects_new;
      glyph_objects = result.glyph_objects;
      glyphBack_objects = result.glyphBack_objects
      let flag_mast_height = result.flag_mast;
      let result_arrow = createArrows(scene, layer, [X, Z], flag_base_Y, arrow_objects, src_objects, tgt_objects, flag_mast_height)
      scene = result_arrow.scene;
      arrow_objects = result_arrow.arrow_objects;
      src_objects = result_arrow.src_objects;
      tgt_objects = result_arrow.tgt_objects;
      console.log("createCityMeshes: loaded " + layer + ", city to load = " + city_to_load);
      delete city_tracking[layer];
      --city_to_load;
    }
  }
  return {
    scene: scene, objects: objects, remain: city_to_load,
    all: city_all, tracking: city_tracking, ceil: ceil_objects, middle: middle_objects, truss: truss_objects,
    window: window_objects, arrow: arrow_objects, src_objects: src_objects, tgt_objects: tgt_objects, flag: flag_objects_new, glyph_objects: glyph_objects
  };
}

function createArrows(scene, name, coord, Y, arrow_objects, src_objects, tgt_objects, flag_mast_height) {
  const length = 30;
  const color = 0xffffff;
  const headLength = 10;
  const headWidth = 5;
  const X = coord[0];
  Y = Y + flag_mast_height + length + headLength / 2;
  const Z = coord[1];
  let direction = new THREE.Vector3(0, -1, 0);
  direction.normalize();
  let origin = new THREE.Vector3(X, Y, Z);

  let arrow = new THREE.ArrowHelper(direction, origin, length, color, headLength, headWidth);
  arrow.visible = false;
  arrow_objects[name] = arrow;
  scene.add(arrow);

  const loader = new THREE.FontLoader();
  loader.load('../textures/helvetiker_regular.typeface.json', function (font) {
    const srcText = new THREE.TextGeometry('SRC', { font: font, size: headWidth, height: headWidth });
    srcText.computeBoundingBox();
    const srcCenter = srcText.boundingBox.getCenter(new THREE.Vector3());
    // console.log(srcCenter)
    srcText.translate(X - srcCenter.x, Y - srcCenter.y, Z - srcCenter.z);
    const srcMesh = new THREE.Mesh(srcText, new THREE.MeshStandardMaterial({ color: 0xffffff }));

    const tgtText = new THREE.TextGeometry('TGT', { font: font, size: headWidth, height: headWidth });
    tgtText.computeBoundingBox();
    const tgtCenter = tgtText.boundingBox.getCenter(new THREE.Vector3());
    tgtText.translate(X - tgtCenter.x, Y - length + headLength / 2 - tgtCenter.y, Z - tgtCenter.z);
    const tgtMesh = new THREE.Mesh(tgtText, new THREE.MeshStandardMaterial({ color: 0xffffff }));

    srcMesh.visible = false;
    tgtMesh.visible = false;
    src_objects[name] = srcMesh;
    tgt_objects[name] = tgtMesh;
    scene.add(srcMesh);
    scene.add(tgtMesh);
  })
  return { scene: scene, arrow_objects: arrow_objects, src_objects: src_objects, tgt_objects: tgt_objects };
}


function extrudeSVG(paths, depth = 20) {
  const svgGroup = new THREE.Group();
  paths.forEach((path, i) => {
    const shapes = SVGLoader.createShapes(path);
    // Each path has array of shapes
    shapes.forEach((shape, j) => {
      // Finally we can take each shape and extrude it
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: depth,
        bevelEnabled: false
      });

      geometry.computeVertexNormals();

      // Create a mesh and add it to the group
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x000000 }));

      svgGroup.add(mesh);
    });
  })
  return svgGroup
}


// From d3-threeD.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function d3threeD(exports) {

  const DEGS_TO_RADS = Math.PI / 180;
  const DIGIT_0 = 48, DIGIT_9 = 57, COMMA = 44, SPACE = 32, PERIOD = 46, MINUS = 45, EXP = 101;

  exports.transformSVGPath = function transformSVGPath(pathStr) {

    const path = new THREE.ShapePath();

    let idx = 1, activeCmd,
      x = 0, y = 0, nx = 0, ny = 0, firstX = null, firstY = null,
      x1 = 0, x2 = 0, y1 = 0, y2 = 0,
      rx = 0, ry = 0, xar = 0, laf = 0, sf = 0, cx, cy;

    const len = pathStr.length;

    function eatNum() {

      let sidx, c, isFloat = false, s;

      // eat delims

      while (idx < len) {

        c = pathStr.charCodeAt(idx);

        if (c !== COMMA && c !== SPACE) break;

        idx++;

      }

      if (c === MINUS) {

        sidx = idx++;

      } else {

        sidx = idx;

      }

      // eat number

      while (idx < len) {

        c = pathStr.charCodeAt(idx);

        if (DIGIT_0 <= c && c <= DIGIT_9) {

          idx++;
          continue;

        } else if (c === PERIOD) {

          idx++;
          isFloat = true;
          continue;

        } else if (c === EXP) {

          idx++;
          isFloat = true;
        } else if (c === MINUS) {
          idx++;
        }

        s = pathStr.substring(sidx, idx);
        return isFloat ? parseFloat(s) : parseInt(s);

      }

      s = pathStr.substring(sidx);
      return isFloat ? parseFloat(s) : parseInt(s);

    }

    function nextIsNum() {

      let c;

      // do permanently eat any delims...

      while (idx < len) {

        c = pathStr.charCodeAt(idx);

        if (c !== COMMA && c !== SPACE) break;

        idx++;

      }

      c = pathStr.charCodeAt(idx);
      return (c === MINUS || (DIGIT_0 <= c && c <= DIGIT_9));

    }

    let canRepeat;
    activeCmd = pathStr[0];

    while (idx <= len) {

      canRepeat = true;

      switch (activeCmd) {

        // moveto commands, become lineto's if repeated
        case 'M':
          x = eatNum();
          y = eatNum();
          path.moveTo(x, y);
          activeCmd = 'L';
          firstX = x;
          firstY = y;
          break;

        case 'm':
          x += eatNum();
          y += eatNum();
          path.moveTo(x, y);
          activeCmd = 'l';
          firstX = x;
          firstY = y;
          break;

        case 'Z':
        case 'z':
          canRepeat = false;
          if (x !== firstX || y !== firstY) path.lineTo(firstX, firstY);
          break;

        // - lines!
        case 'L':
        case 'H':
        case 'V':
          nx = (activeCmd === 'V') ? x : eatNum();
          ny = (activeCmd === 'H') ? y : eatNum();
          path.lineTo(nx, ny);
          x = nx;
          y = ny;
          break;

        case 'l':
        case 'h':
        case 'v':
          nx = (activeCmd === 'v') ? x : (x + eatNum());
          ny = (activeCmd === 'h') ? y : (y + eatNum());
          path.lineTo(nx, ny);
          x = nx;
          y = ny;
          break;

        // - cubic bezier
        case 'C':
          x1 = eatNum(); y1 = eatNum();

        case 'S':
          if (activeCmd === 'S') {

            x1 = 2 * x - x2;
            y1 = 2 * y - y2;

          }

          x2 = eatNum();
          y2 = eatNum();
          nx = eatNum();
          ny = eatNum();
          path.bezierCurveTo(x1, y1, x2, y2, nx, ny);
          x = nx; y = ny;
          break;

        case 'c':
          x1 = x + eatNum();
          y1 = y + eatNum();

        case 's':
          if (activeCmd === 's') {

            x1 = 2 * x - x2;
            y1 = 2 * y - y2;

          }

          x2 = x + eatNum();
          y2 = y + eatNum();
          nx = x + eatNum();
          ny = y + eatNum();
          path.bezierCurveTo(x1, y1, x2, y2, nx, ny);
          x = nx; y = ny;
          break;

        // - quadratic bezier
        case 'Q':
          x1 = eatNum(); y1 = eatNum();

        case 'T':
          if (activeCmd === 'T') {

            x1 = 2 * x - x1;
            y1 = 2 * y - y1;

          }

          nx = eatNum();
          ny = eatNum();
          path.quadraticCurveTo(x1, y1, nx, ny);
          x = nx;
          y = ny;
          break;

        case 'q':
          x1 = x + eatNum();
          y1 = y + eatNum();

        case 't':
          if (activeCmd === 't') {

            x1 = 2 * x - x1;
            y1 = 2 * y - y1;

          }

          nx = x + eatNum();
          ny = y + eatNum();
          path.quadraticCurveTo(x1, y1, nx, ny);
          x = nx; y = ny;
          break;

        // - elliptical arc
        case 'A':
          rx = eatNum();
          ry = eatNum();
          xar = eatNum() * DEGS_TO_RADS;
          laf = eatNum();
          sf = eatNum();
          nx = eatNum();
          ny = eatNum();
          if (rx !== ry) console.warn('Forcing elliptical arc to be a circular one:', rx, ry);

          // SVG implementation notes does all the math for us! woo!
          // http://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes

          // step1, using x1 as x1'

          x1 = Math.cos(xar) * (x - nx) / 2 + Math.sin(xar) * (y - ny) / 2;
          y1 = - Math.sin(xar) * (x - nx) / 2 + Math.cos(xar) * (y - ny) / 2;

          // step 2, using x2 as cx'

          let norm = Math.sqrt((rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1) /
            (rx * rx * y1 * y1 + ry * ry * x1 * x1));

          if (laf === sf) norm = - norm;

          x2 = norm * rx * y1 / ry;
          y2 = norm * - ry * x1 / rx;

          // step 3

          cx = Math.cos(xar) * x2 - Math.sin(xar) * y2 + (x + nx) / 2;
          cy = Math.sin(xar) * x2 + Math.cos(xar) * y2 + (y + ny) / 2;

          const u = new THREE.Vector2(1, 0);
          const v = new THREE.Vector2((x1 - x2) / rx, (y1 - y2) / ry);

          let startAng = Math.acos(u.dot(v) / u.length() / v.length());

          if (((u.x * v.y) - (u.y * v.x)) < 0) startAng = - startAng;

          // we can reuse 'v' from start angle as our 'u' for delta angle
          u.x = (- x1 - x2) / rx;
          u.y = (- y1 - y2) / ry;

          let deltaAng = Math.acos(v.dot(u) / v.length() / u.length());

          // This normalization ends up making our curves fail to triangulate...

          if (((v.x * u.y) - (v.y * u.x)) < 0) deltaAng = - deltaAng;
          if (!sf && deltaAng > 0) deltaAng -= Math.PI * 2;
          if (sf && deltaAng < 0) deltaAng += Math.PI * 2;

          path.absarc(cx, cy, rx, startAng, startAng + deltaAng, sf);
          x = nx;
          y = ny;
          break;

        default:
          throw new Error('Wrong path command: ' + activeCmd);

      }

      // just reissue the command

      if (canRepeat && nextIsNum()) continue;

      activeCmd = pathStr[idx++];

    }

    return path;

  };

}



export { loadColor, loadSpiral, loadSpiral_dagType, loadFloor, loadVoronoi, createCityMeshes };
