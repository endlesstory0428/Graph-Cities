// // for coloring
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

let grey2red = [[0.000, [0.780, 0.780, 0.780]], [0.002, [0.778, 0.779, 0.780]], [0.004, [0.776, 0.778, 0.780]], [0.006, [0.774, 0.778, 0.780]], [0.008, [0.772, 0.777, 0.780]], [0.010, [0.769, 0.776, 0.781]], [0.012, [0.767, 0.775, 0.781]], [0.014, [0.765, 0.774, 0.781]], [0.016, [0.763, 0.774, 0.781]], [0.018, [0.761, 0.773, 0.781]], [0.020, [0.758, 0.772, 0.782]], [0.022, [0.756, 0.772, 0.782]], [0.024, [0.754, 0.771, 0.782]], [0.026, [0.752, 0.770, 0.782]], [0.028, [0.750, 0.770, 0.782]], [0.030, [0.747, 0.769, 0.783]], [0.032, [0.745, 0.769, 0.783]], [0.034, [0.743, 0.768, 0.783]], [0.036, [0.741, 0.767, 0.783]], [0.038, [0.738, 0.767, 0.784]], [0.040, [0.736, 0.766, 0.784]], [0.042, [0.734, 0.766, 0.784]], [0.044, [0.731, 0.765, 0.785]], [0.046, [0.729, 0.765, 0.785]], [0.048, [0.727, 0.765, 0.785]], [0.050, [0.724, 0.764, 0.786]], [0.052, [0.722, 0.764, 0.786]], [0.054, [0.720, 0.763, 0.786]], [0.056, [0.717, 0.763, 0.787]], [0.058, [0.715, 0.763, 0.787]], [0.060, [0.712, 0.762, 0.788]], [0.062, [0.710, 0.762, 0.788]], [0.064, [0.708, 0.762, 0.788]], [0.066, [0.705, 0.762, 0.789]], [0.068, [0.703, 0.762, 0.789]], [0.070, [0.700, 0.761, 0.790]], [0.072, [0.698, 0.761, 0.790]], [0.074, [0.695, 0.761, 0.791]], [0.076, [0.693, 0.761, 0.791]], [0.078, [0.690, 0.761, 0.792]], [0.080, [0.688, 0.761, 0.792]], [0.082, [0.685, 0.761, 0.793]], [0.084, [0.683, 0.761, 0.793]], [0.086, [0.680, 0.761, 0.794]], [0.088, [0.678, 0.761, 0.794]], [0.090, [0.675, 0.761, 0.795]], [0.092, [0.673, 0.761, 0.795]], [0.094, [0.670, 0.761, 0.796]], [0.096, [0.668, 0.761, 0.796]], [0.098, [0.665, 0.761, 0.797]], [0.100, [0.662, 0.761, 0.797]], [0.102, [0.660, 0.762, 0.798]], [0.104, [0.657, 0.762, 0.799]], [0.106, [0.655, 0.762, 0.799]], [0.108, [0.652, 0.762, 0.800]], [0.110, [0.649, 0.763, 0.801]], [0.112, [0.647, 0.763, 0.801]], [0.114, [0.644, 0.764, 0.802]], [0.116, [0.641, 0.764, 0.803]], [0.118, [0.639, 0.764, 0.803]], [0.120, [0.636, 0.765, 0.804]], [0.122, [0.633, 0.765, 0.805]], [0.124, [0.631, 0.766, 0.805]], [0.126, [0.628, 0.766, 0.806]], [0.128, [0.625, 0.767, 0.807]], [0.130, [0.622, 0.767, 0.808]], [0.132, [0.620, 0.768, 0.808]], [0.134, [0.617, 0.769, 0.809]], [0.136, [0.614, 0.769, 0.810]], [0.138, [0.611, 0.770, 0.811]], [0.140, [0.608, 0.771, 0.812]], [0.142, [0.606, 0.772, 0.812]], [0.144, [0.603, 0.772, 0.813]], [0.146, [0.600, 0.773, 0.814]], [0.148, [0.597, 0.774, 0.815]], [0.150, [0.594, 0.775, 0.816]], [0.152, [0.592, 0.776, 0.816]], [0.154, [0.589, 0.777, 0.817]], [0.156, [0.586, 0.778, 0.818]], [0.158, [0.583, 0.779, 0.819]], [0.160, [0.580, 0.780, 0.820]], [0.162, [0.577, 0.781, 0.821]], [0.164, [0.574, 0.782, 0.822]], [0.166, [0.571, 0.783, 0.823]], [0.168, [0.568, 0.785, 0.824]], [0.170, [0.565, 0.786, 0.825]], [0.172, [0.562, 0.787, 0.826]], [0.174, [0.559, 0.788, 0.827]], [0.176, [0.556, 0.790, 0.828]], [0.178, [0.553, 0.791, 0.829]], [0.180, [0.550, 0.792, 0.829]], [0.182, [0.547, 0.794, 0.831]], [0.184, [0.544, 0.795, 0.832]], [0.186, [0.541, 0.797, 0.833]], [0.188, [0.538, 0.798, 0.834]], [0.190, [0.535, 0.800, 0.835]], [0.192, [0.532, 0.801, 0.836]], [0.194, [0.529, 0.803, 0.837]], [0.196, [0.526, 0.805, 0.838]], [0.198, [0.523, 0.806, 0.839]], [0.200, [0.520, 0.808, 0.840]], [0.202, [0.517, 0.810, 0.841]], [0.204, [0.514, 0.812, 0.842]], [0.206, [0.511, 0.813, 0.843]], [0.208, [0.508, 0.815, 0.844]], [0.210, [0.504, 0.817, 0.846]], [0.212, [0.501, 0.819, 0.847]], [0.214, [0.498, 0.821, 0.848]], [0.216, [0.495, 0.823, 0.849]], [0.218, [0.492, 0.825, 0.850]], [0.220, [0.489, 0.827, 0.851]], [0.222, [0.485, 0.829, 0.853]], [0.224, [0.482, 0.832, 0.854]], [0.226, [0.479, 0.834, 0.855]], [0.228, [0.476, 0.836, 0.856]], [0.230, [0.472, 0.838, 0.858]], [0.232, [0.469, 0.841, 0.859]], [0.234, [0.466, 0.843, 0.860]], [0.236, [0.463, 0.845, 0.861]], [0.238, [0.459, 0.848, 0.863]], [0.240, [0.456, 0.850, 0.864]], [0.242, [0.453, 0.853, 0.865]], [0.244, [0.449, 0.855, 0.867]], [0.246, [0.446, 0.858, 0.868]], [0.248, [0.443, 0.861, 0.869]], [0.250, [0.439, 0.863, 0.871]], [0.252, [0.436, 0.866, 0.872]], [0.254, [0.433, 0.869, 0.873]], [0.256, [0.429, 0.872, 0.875]], [0.258, [0.426, 0.875, 0.876]], [0.260, [0.422, 0.877, 0.877]], [0.262, [0.419, 0.879, 0.877]], [0.264, [0.416, 0.880, 0.877]], [0.266, [0.412, 0.882, 0.877]], [0.268, [0.409, 0.883, 0.877]], [0.270, [0.405, 0.885, 0.877]], [0.272, [0.402, 0.886, 0.876]], [0.274, [0.398, 0.888, 0.876]], [0.276, [0.395, 0.889, 0.876]], [0.278, [0.391, 0.891, 0.876]], [0.280, [0.388, 0.892, 0.875]], [0.282, [0.384, 0.894, 0.875]], [0.284, [0.381, 0.895, 0.874]], [0.286, [0.377, 0.897, 0.874]], [0.288, [0.374, 0.898, 0.874]], [0.290, [0.370, 0.900, 0.873]], [0.292, [0.367, 0.901, 0.873]], [0.294, [0.363, 0.903, 0.872]], [0.296, [0.360, 0.904, 0.872]], [0.298, [0.356, 0.906, 0.871]], [0.300, [0.353, 0.907, 0.871]], [0.302, [0.349, 0.909, 0.870]], [0.304, [0.345, 0.911, 0.869]], [0.306, [0.342, 0.912, 0.869]], [0.308, [0.338, 0.914, 0.868]], [0.310, [0.334, 0.916, 0.867]], [0.312, [0.331, 0.917, 0.866]], [0.314, [0.327, 0.919, 0.866]], [0.316, [0.323, 0.921, 0.865]], [0.318, [0.320, 0.922, 0.864]], [0.320, [0.316, 0.924, 0.863]], [0.322, [0.312, 0.926, 0.862]], [0.324, [0.309, 0.927, 0.861]], [0.326, [0.305, 0.929, 0.860]], [0.328, [0.301, 0.931, 0.860]], [0.330, [0.297, 0.933, 0.859]], [0.332, [0.294, 0.934, 0.857]], [0.334, [0.290, 0.936, 0.856]], [0.336, [0.286, 0.938, 0.855]], [0.338, [0.282, 0.940, 0.854]], [0.340, [0.278, 0.942, 0.853]], [0.342, [0.275, 0.943, 0.852]], [0.344, [0.271, 0.945, 0.851]], [0.346, [0.267, 0.947, 0.849]], [0.348, [0.263, 0.949, 0.848]], [0.350, [0.259, 0.951, 0.847]], [0.352, [0.256, 0.952, 0.846]], [0.354, [0.252, 0.954, 0.844]], [0.356, [0.248, 0.956, 0.843]], [0.358, [0.244, 0.958, 0.841]], [0.360, [0.240, 0.960, 0.840]], [0.362, [0.236, 0.962, 0.839]], [0.364, [0.232, 0.964, 0.837]], [0.366, [0.228, 0.966, 0.835]], [0.368, [0.224, 0.968, 0.834]], [0.370, [0.220, 0.970, 0.832]], [0.372, [0.216, 0.972, 0.831]], [0.374, [0.212, 0.974, 0.829]], [0.376, [0.208, 0.976, 0.827]], [0.378, [0.204, 0.978, 0.825]], [0.380, [0.200, 0.980, 0.824]], [0.382, [0.196, 0.982, 0.822]], [0.384, [0.192, 0.984, 0.820]], [0.386, [0.188, 0.986, 0.818]], [0.388, [0.184, 0.988, 0.816]], [0.390, [0.180, 0.990, 0.814]], [0.392, [0.176, 0.992, 0.812]], [0.394, [0.172, 0.994, 0.810]], [0.396, [0.168, 0.996, 0.808]], [0.398, [0.164, 0.998, 0.806]], [0.400, [0.160, 1.000, 0.804]], [0.402, [0.161, 1.000, 0.806]], [0.404, [0.174, 1.000, 0.794]], [0.406, [0.174, 1.000, 0.794]], [0.408, [0.187, 1.000, 0.781]], [0.410, [0.187, 1.000, 0.781]], [0.412, [0.199, 1.000, 0.769]], [0.414, [0.199, 1.000, 0.769]], [0.416, [0.212, 1.000, 0.756]], [0.418, [0.225, 1.000, 0.743]], [0.420, [0.225, 1.000, 0.743]], [0.422, [0.237, 1.000, 0.731]], [0.424, [0.237, 1.000, 0.731]], [0.426, [0.250, 1.000, 0.718]], [0.428, [0.250, 1.000, 0.718]], [0.430, [0.262, 1.000, 0.705]], [0.432, [0.262, 1.000, 0.705]], [0.434, [0.275, 1.000, 0.693]], [0.436, [0.275, 1.000, 0.693]], [0.438, [0.288, 1.000, 0.680]], [0.440, [0.288, 1.000, 0.680]], [0.442, [0.300, 1.000, 0.667]], [0.444, [0.300, 1.000, 0.667]], [0.446, [0.313, 1.000, 0.655]], [0.448, [0.313, 1.000, 0.655]], [0.450, [0.326, 1.000, 0.642]], [0.452, [0.326, 1.000, 0.642]], [0.454, [0.338, 1.000, 0.629]], [0.456, [0.338, 1.000, 0.629]], [0.458, [0.351, 1.000, 0.617]], [0.460, [0.351, 1.000, 0.617]], [0.462, [0.364, 1.000, 0.604]], [0.464, [0.364, 1.000, 0.604]], [0.466, [0.376, 1.000, 0.591]], [0.468, [0.376, 1.000, 0.591]], [0.470, [0.389, 1.000, 0.579]], [0.472, [0.389, 1.000, 0.579]], [0.474, [0.402, 1.000, 0.566]], [0.476, [0.402, 1.000, 0.566]], [0.478, [0.414, 1.000, 0.553]], [0.480, [0.414, 1.000, 0.553]], [0.482, [0.427, 1.000, 0.541]], [0.484, [0.427, 1.000, 0.541]], [0.486, [0.440, 1.000, 0.528]], [0.488, [0.440, 1.000, 0.528]], [0.490, [0.452, 1.000, 0.515]], [0.492, [0.452, 1.000, 0.515]], [0.494, [0.465, 1.000, 0.503]], [0.496, [0.465, 1.000, 0.503]], [0.498, [0.478, 1.000, 0.490]], [0.500, [0.490, 1.000, 0.478]], [0.502, [0.490, 1.000, 0.478]], [0.504, [0.503, 1.000, 0.465]], [0.506, [0.503, 1.000, 0.465]], [0.508, [0.515, 1.000, 0.452]], [0.510, [0.515, 1.000, 0.452]], [0.512, [0.528, 1.000, 0.440]], [0.514, [0.528, 1.000, 0.440]], [0.516, [0.541, 1.000, 0.427]], [0.518, [0.541, 1.000, 0.427]], [0.520, [0.553, 1.000, 0.414]], [0.522, [0.553, 1.000, 0.414]], [0.524, [0.566, 1.000, 0.402]], [0.526, [0.566, 1.000, 0.402]], [0.528, [0.579, 1.000, 0.389]], [0.530, [0.579, 1.000, 0.389]], [0.532, [0.591, 1.000, 0.376]], [0.534, [0.591, 1.000, 0.376]], [0.536, [0.604, 1.000, 0.364]], [0.538, [0.604, 1.000, 0.364]], [0.540, [0.617, 1.000, 0.351]], [0.542, [0.617, 1.000, 0.351]], [0.544, [0.629, 1.000, 0.338]], [0.546, [0.629, 1.000, 0.338]], [0.548, [0.642, 1.000, 0.326]], [0.550, [0.642, 1.000, 0.326]], [0.552, [0.655, 1.000, 0.313]], [0.554, [0.655, 1.000, 0.313]], [0.556, [0.667, 1.000, 0.300]], [0.558, [0.667, 1.000, 0.300]], [0.560, [0.680, 1.000, 0.288]], [0.562, [0.680, 1.000, 0.288]], [0.564, [0.693, 1.000, 0.275]], [0.566, [0.693, 1.000, 0.275]], [0.568, [0.705, 1.000, 0.262]], [0.570, [0.705, 1.000, 0.262]], [0.572, [0.718, 1.000, 0.250]], [0.574, [0.718, 1.000, 0.250]], [0.576, [0.731, 1.000, 0.237]], [0.578, [0.731, 1.000, 0.237]], [0.580, [0.743, 1.000, 0.225]], [0.582, [0.743, 1.000, 0.225]], [0.584, [0.756, 1.000, 0.212]], [0.586, [0.769, 1.000, 0.199]], [0.588, [0.769, 1.000, 0.199]], [0.590, [0.781, 1.000, 0.187]], [0.592, [0.781, 1.000, 0.187]], [0.594, [0.794, 1.000, 0.174]], [0.596, [0.794, 1.000, 0.174]], [0.598, [0.806, 1.000, 0.161]], [0.600, [0.806, 1.000, 0.161]], [0.602, [0.819, 1.000, 0.149]], [0.604, [0.819, 1.000, 0.149]], [0.606, [0.832, 1.000, 0.136]], [0.608, [0.832, 1.000, 0.136]], [0.610, [0.844, 1.000, 0.123]], [0.612, [0.844, 1.000, 0.123]], [0.614, [0.857, 1.000, 0.111]], [0.616, [0.857, 1.000, 0.111]], [0.618, [0.870, 1.000, 0.098]], [0.620, [0.870, 1.000, 0.098]], [0.622, [0.882, 1.000, 0.085]], [0.624, [0.882, 1.000, 0.085]], [0.626, [0.895, 1.000, 0.073]], [0.628, [0.895, 1.000, 0.073]], [0.630, [0.908, 1.000, 0.060]], [0.632, [0.908, 1.000, 0.060]], [0.634, [0.920, 1.000, 0.047]], [0.636, [0.920, 1.000, 0.047]], [0.638, [0.933, 1.000, 0.035]], [0.640, [0.933, 1.000, 0.035]], [0.642, [0.946, 0.988, 0.022]], [0.644, [0.946, 0.988, 0.022]], [0.646, [0.958, 0.974, 0.009]], [0.648, [0.958, 0.974, 0.009]], [0.650, [0.971, 0.959, 0.000]], [0.652, [0.971, 0.959, 0.000]], [0.654, [0.984, 0.945, 0.000]], [0.656, [0.984, 0.945, 0.000]], [0.658, [0.996, 0.930, 0.000]], [0.660, [0.996, 0.930, 0.000]], [0.662, [1.000, 0.916, 0.000]], [0.664, [1.000, 0.916, 0.000]], [0.666, [1.000, 0.901, 0.000]], [0.668, [1.000, 0.887, 0.000]], [0.670, [1.000, 0.887, 0.000]], [0.672, [1.000, 0.872, 0.000]], [0.674, [1.000, 0.872, 0.000]], [0.676, [1.000, 0.858, 0.000]], [0.678, [1.000, 0.858, 0.000]], [0.680, [1.000, 0.843, 0.000]], [0.682, [1.000, 0.843, 0.000]], [0.684, [1.000, 0.829, 0.000]], [0.686, [1.000, 0.829, 0.000]], [0.688, [1.000, 0.814, 0.000]], [0.690, [1.000, 0.814, 0.000]], [0.692, [1.000, 0.800, 0.000]], [0.694, [1.000, 0.800, 0.000]], [0.696, [1.000, 0.785, 0.000]], [0.698, [1.000, 0.785, 0.000]], [0.700, [1.000, 0.771, 0.000]], [0.702, [1.000, 0.771, 0.000]], [0.704, [1.000, 0.756, 0.000]], [0.706, [1.000, 0.756, 0.000]], [0.708, [1.000, 0.741, 0.000]], [0.710, [1.000, 0.741, 0.000]], [0.712, [1.000, 0.727, 0.000]], [0.714, [1.000, 0.727, 0.000]], [0.716, [1.000, 0.712, 0.000]], [0.718, [1.000, 0.712, 0.000]], [0.720, [1.000, 0.698, 0.000]], [0.722, [1.000, 0.698, 0.000]], [0.724, [1.000, 0.683, 0.000]], [0.726, [1.000, 0.683, 0.000]], [0.728, [1.000, 0.669, 0.000]], [0.730, [1.000, 0.669, 0.000]], [0.732, [1.000, 0.654, 0.000]], [0.734, [1.000, 0.654, 0.000]], [0.736, [1.000, 0.640, 0.000]], [0.738, [1.000, 0.640, 0.000]], [0.740, [1.000, 0.625, 0.000]], [0.742, [1.000, 0.625, 0.000]], [0.744, [1.000, 0.611, 0.000]], [0.746, [1.000, 0.611, 0.000]], [0.748, [1.000, 0.596, 0.000]], [0.750, [1.000, 0.582, 0.000]], [0.752, [1.000, 0.582, 0.000]], [0.754, [1.000, 0.567, 0.000]], [0.756, [1.000, 0.567, 0.000]], [0.758, [1.000, 0.553, 0.000]], [0.760, [1.000, 0.553, 0.000]], [0.762, [1.000, 0.538, 0.000]], [0.764, [1.000, 0.538, 0.000]], [0.766, [1.000, 0.524, 0.000]], [0.768, [1.000, 0.524, 0.000]], [0.770, [1.000, 0.509, 0.000]], [0.772, [1.000, 0.509, 0.000]], [0.774, [1.000, 0.495, 0.000]], [0.776, [1.000, 0.495, 0.000]], [0.778, [1.000, 0.480, 0.000]], [0.780, [1.000, 0.480, 0.000]], [0.782, [1.000, 0.466, 0.000]], [0.784, [1.000, 0.466, 0.000]], [0.786, [1.000, 0.451, 0.000]], [0.788, [1.000, 0.451, 0.000]], [0.790, [1.000, 0.436, 0.000]], [0.792, [1.000, 0.436, 0.000]], [0.794, [1.000, 0.422, 0.000]], [0.796, [1.000, 0.422, 0.000]], [0.798, [1.000, 0.407, 0.000]], [0.800, [1.000, 0.407, 0.000]], [0.802, [1.000, 0.393, 0.000]], [0.804, [1.000, 0.393, 0.000]], [0.806, [1.000, 0.378, 0.000]], [0.808, [1.000, 0.378, 0.000]], [0.810, [1.000, 0.364, 0.000]], [0.812, [1.000, 0.364, 0.000]], [0.814, [1.000, 0.349, 0.000]], [0.816, [1.000, 0.349, 0.000]], [0.818, [1.000, 0.335, 0.000]], [0.820, [1.000, 0.335, 0.000]], [0.822, [1.000, 0.320, 0.000]], [0.824, [1.000, 0.320, 0.000]], [0.826, [1.000, 0.306, 0.000]], [0.828, [1.000, 0.306, 0.000]], [0.830, [1.000, 0.291, 0.000]], [0.832, [1.000, 0.291, 0.000]], [0.834, [1.000, 0.277, 0.000]], [0.836, [1.000, 0.262, 0.000]], [0.838, [1.000, 0.262, 0.000]], [0.840, [1.000, 0.248, 0.000]], [0.842, [1.000, 0.248, 0.000]], [0.844, [1.000, 0.233, 0.000]], [0.846, [1.000, 0.233, 0.000]], [0.848, [1.000, 0.219, 0.000]], [0.850, [1.000, 0.219, 0.000]], [0.852, [1.000, 0.204, 0.000]], [0.854, [1.000, 0.204, 0.000]], [0.856, [1.000, 0.190, 0.000]], [0.858, [1.000, 0.190, 0.000]], [0.860, [1.000, 0.175, 0.000]], [0.862, [1.000, 0.175, 0.000]], [0.864, [1.000, 0.160, 0.000]], [0.866, [1.000, 0.160, 0.000]], [0.868, [1.000, 0.146, 0.000]], [0.870, [1.000, 0.146, 0.000]], [0.872, [1.000, 0.131, 0.000]], [0.874, [1.000, 0.131, 0.000]], [0.876, [1.000, 0.117, 0.000]], [0.878, [1.000, 0.117, 0.000]], [0.880, [1.000, 0.102, 0.000]], [0.882, [1.000, 0.102, 0.000]], [0.884, [1.000, 0.088, 0.000]], [0.886, [1.000, 0.088, 0.000]], [0.888, [0.999, 0.073, 0.000]], [0.890, [0.999, 0.073, 0.000]], [0.892, [0.981, 0.059, 0.000]], [0.894, [0.981, 0.059, 0.000]], [0.896, [0.963, 0.044, 0.000]], [0.898, [0.963, 0.044, 0.000]], [0.900, [0.946, 0.030, 0.000]], [0.902, [0.946, 0.030, 0.000]], [0.904, [0.928, 0.015, 0.000]], [0.906, [0.928, 0.015, 0.000]], [0.908, [0.910, 0.001, 0.000]], [0.910, [0.910, 0.001, 0.000]], [0.912, [0.892, 0.000, 0.000]], [0.914, [0.892, 0.000, 0.000]], [0.916, [0.874, 0.000, 0.000]], [0.918, [0.857, 0.000, 0.000]], [0.920, [0.857, 0.000, 0.000]], [0.922, [0.839, 0.000, 0.000]], [0.924, [0.839, 0.000, 0.000]], [0.926, [0.821, 0.000, 0.000]], [0.928, [0.821, 0.000, 0.000]], [0.930, [0.803, 0.000, 0.000]], [0.932, [0.803, 0.000, 0.000]], [0.934, [0.785, 0.000, 0.000]], [0.936, [0.785, 0.000, 0.000]], [0.938, [0.767, 0.000, 0.000]], [0.940, [0.767, 0.000, 0.000]], [0.942, [0.750, 0.000, 0.000]], [0.944, [0.750, 0.000, 0.000]], [0.946, [0.732, 0.000, 0.000]], [0.948, [0.732, 0.000, 0.000]], [0.950, [0.714, 0.000, 0.000]], [0.952, [0.714, 0.000, 0.000]], [0.954, [0.696, 0.000, 0.000]], [0.956, [0.696, 0.000, 0.000]], [0.958, [0.678, 0.000, 0.000]], [0.960, [0.678, 0.000, 0.000]], [0.962, [0.660, 0.000, 0.000]], [0.964, [0.660, 0.000, 0.000]], [0.966, [0.643, 0.000, 0.000]], [0.968, [0.643, 0.000, 0.000]], [0.970, [0.625, 0.000, 0.000]], [0.972, [0.625, 0.000, 0.000]], [0.974, [0.607, 0.000, 0.000]], [0.976, [0.607, 0.000, 0.000]], [0.978, [0.589, 0.000, 0.000]], [0.980, [0.589, 0.000, 0.000]], [0.982, [0.571, 0.000, 0.000]], [0.984, [0.571, 0.000, 0.000]], [0.986, [0.553, 0.000, 0.000]], [0.988, [0.553, 0.000, 0.000]], [0.990, [0.536, 0.000, 0.000]], [0.992, [0.536, 0.000, 0.000]], [0.994, [0.518, 0.000, 0.000]], [0.996, [0.518, 0.000, 0.000]], [0.998, [0.500, 0.000, 0.000]], [1.000, [0.500, 0.000, 0.000]]];


// // small tool functions
// // for graph
const aveDeg = d => d['edges'] / d['vertices'] * 2;
const density = d => d['vertices'] === 1 ? 0 : aveDeg(d) / (d['vertices'] - 1);
const curve = (val, factor) => 1 - Math.log(val * (1 - factor) + factor) / Math.log(factor);
// // for tooltip
const buildingWaveTooltip = d => `wave ${d['wave']}\nV: ${d['info']['vertices']} E: ${d['info']['edges']}\naveDeg: ${aveDeg(d['info']).toFixed(2)} density: ${density(d['info']).toExponential(2)}`;
const buildingFixpointTooltip = d => `fixpoint ${d['layer']}-${d['lcc']}\nV: ${d['vertices']} E: ${d['edges']}\naveDeg: ${aveDeg(d).toFixed(2)} density: ${density(d).toExponential(2)}`;
const buildingFixpointCircleTooltip = d => `fixpoint ${d['layer']}-${d['lccList'][0]['lcc']}\nV: ${d['lccList'][0]['vertices']} E: ${d['lccList'][0]['edges']}\naveDeg: ${aveDeg(d['lccList'][0]).toFixed(2)} density: ${density(d['lccList'][0]).toExponential(2)}`;
const spiralCCTooltip = d => (d['layer'] === 1 ? `#cc: ${d['count']}` : `#cc: ${d['count']} #sub-bucket: ${Object.keys(d['subBucket']).length}`) + ` minSize: V${d['minCC'][1]}E${d['minCC'][0]} aveSize: V${(d['vertices']/d['count']).toFixed(0)}E${(d['edges']/d['count']).toFixed(0)} maxSize: V${d['maxCC'][1]}E${d['maxCC'][0]}`
const spiralFixpointTooltip = d => `fixpoint ${d['layer']}\nV: ${d['vertices']} E: ${d['edges']}\naveDeg: ${aveDeg(d).toFixed(2)} density: ${density(d).toExponential(2)}`
// // for ploting
const speedometerLine = (srcPos, vPos, xPos, yPos, sizeSacle) => d3.line()([srcPos, [0, 0], vPos].map(pos => [pos[0] * sizeSacle + xPos, pos[1] * sizeSacle + yPos]));
const spiralLine = (posList, xPos, yPos, sizeSacle) => d3.line().curve(d3.curveBasis)(posList.map(pos => [pos[0] * sizeSacle + xPos, pos[1] * sizeSacle + yPos]));
// Create buildingId 
const buildingId = d => `b${d['bucket']}l${d['layer']}`;

// // data object for click selection
// let buildingMapControls = {};
// let intrestedElement;
// let ignoreHover;
// let isOpen;

// // split a building into waves
function expandWave(building) {
    const waveList = [];
    const bucket = building['bucket'];
    const layer = building['layer'];
    const lcc = building['lccList'][0]['lcc'];
    const vertices = building['lccList'][0]['vertices'];
    const edges = building['lccList'][0]['edges'];
    for (const [wave, waveInfo] of Object.entries(building['lccList'][0]['waves'])) {
        waveList.push({ 'bucket': bucket, 'layer': layer, 'lcc': lcc, 'vertices': vertices, 'edges': edges, 'wave': wave, 'info': waveInfo });
    };
    return waveList
}

// // local log bucket of lccList
function logBucket(lccList) {
    let maxSize = 0;
    let sumSize = 0;
    for (const lcc of lccList) {
        if (maxSize < lcc['edges']) {
            maxSize = lcc['edges'];
        };
        sumSize += lcc['edges'];
    };

    const baseThreshold = Math.log(sumSize);
    const threholdList = [0];
    let bucketLength = 1;

    const bucketDict = { '0': { 'bucket': 0, 'threshold': 0, 'lccList': [] } };

    while (true) {
        const tempThreshold = Math.floor(Math.pow(baseThreshold, bucketLength));
        threholdList.push(tempThreshold);
        bucketDict[bucketLength.toString()] = { 'bucket': bucketLength, 'threshold': tempThreshold, 'lccList': [] };
        bucketLength += 1;
        if (tempThreshold > maxSize) {
            break;
        };
    };

    // console.log(threholdList);
    // console.log(bucketDict);

    for (const lcc of lccList) {
        const size = lcc['edges']
        for (let i = 0; i < bucketLength; i++) {
            if (threholdList[i] > size) {
                bucketDict[i - 1]['lccList'].push(lcc);
            };
        };
    };

    for (const [bucketIdx, bucketInfo] of Object.entries(bucketDict)) {
        if (bucketInfo['lccList'].length === 0) {
            delete bucketDict[bucketIdx];
        };
    };
    // console.log(bucketDict)
    return bucketDict;
}

// // split data into buildings(stars) and sprials
function splitSpiral(data, bucketPeel2Building) {
    const buildingList = [];
    const spiralList = [];
    for (const [bucket, bucketInfo] of Object.entries(data)) {
        const peelData = bucketInfo['peel'];
        for (const [peel, lccInfo] of Object.entries(peelData)) {
            const lccList = lccInfo['lccList'];
            if (parseInt(peel) === 1) {
                if (lccList[0]['single']) {
                    buildingList.push({ 'bucket': parseInt(bucket), 'layer': parseInt(peel), 'lccList': lccList, 'buildingName': bucketPeel2Building[bucket][peel] });
                } else {
                    spiralList.push({ 'bucket': parseInt(bucket), 'layer': parseInt(peel), 'count': lccList[0]['count'], 'lccList': lccList, 'buildingName': bucketPeel2Building[bucket][peel], 'minCC': lccInfo['minSize'], 'maxCC': lccInfo['maxSize'] });
                };
            } else {
                const lccCount = lccList.length;
                if (lccCount === 1) {
                    buildingList.push({ 'bucket': parseInt(bucket), 'layer': parseInt(peel), 'lccList': lccList, 'buildingName': bucketPeel2Building[bucket][peel] });
                } else {
                    spiralList.push({ 'bucket': parseInt(bucket), 'layer': parseInt(peel), 'count': lccCount, 'lccList': lccList, 'subBucket': logBucket(lccList), 'buildingName': bucketPeel2Building[bucket][peel], 'minCC': lccInfo['minSize'], 'maxCC': lccInfo['maxSize'] });
                };
            }
        };
    };
    return [buildingList, spiralList];
};

// // get sppedometer info for buildingList
function getSpeedometer(buildingList) {
    // // scan primary sizes and angles
    let maxAngle = 0;
    for (const buildingInfo of buildingList) {
        let maxVSize = 0;
        buildingInfo['aveDeg'] = aveDeg(buildingInfo['lccList'][0]);
        const waveData = buildingInfo['lccList'][0]['waves'];
        // console.log(waveData)
        for (const [waveIdx, waveInfo] of Object.entries(waveData)) {
            // console.log(waveInfo);
            const srcSize = Math.log(waveInfo['source'] + 1);
            const vSize = Math.log(waveInfo['vertices'] + 1);
            const eSize = Math.log(waveInfo['edges'] + 1);
            const angle = eSize / vSize / srcSize;
            waveData[waveIdx]['srcSize'] = srcSize;
            waveData[waveIdx]['vSize'] = vSize;
            waveData[waveIdx]['eSize'] = eSize;
            waveData[waveIdx]['angle'] = angle;
            if (angle > maxAngle) {
                maxAngle = angle;
            };
            if (vSize > maxVSize) {
                maxVSize = vSize;
            };
        };
        buildingInfo['maxVSize'] = maxVSize;
    };
    // console.log(buildingList);

    // // scan max sum angle
    let maxSumAngle = 0;
    for (const buildingInfo of buildingList) {
        const waveData = buildingInfo['lccList'][0]['waves'];
        // console.log(waveData)
        let sumAngle = 0;
        for (const [waveIdx, waveInfo] of Object.entries(waveData)) {
            // console.log(waveInfo);
            const angle = Math.asin(waveData[waveIdx]['angle'] / maxAngle);
            waveData[waveIdx]['angle'] = angle
            sumAngle += angle;
        };
        if (sumAngle > maxSumAngle) {
            maxSumAngle = sumAngle;
        };
    };

    const angleFactor = (Math.PI * 7 / 4) / maxSumAngle;
    // console.log(angleFactor)

    // // scan triangle positions for each wave
    for (const buildingInfo of buildingList) {
        const waveData = buildingInfo['lccList'][0]['waves'];
        // console.log(waveData)
        let sumAngle = (buildingInfo['aveDeg'] / buildingInfo['layer'] - 1) * Math.PI;
        for (const [waveIdx, waveInfo] of Object.entries(waveData)) {
            // console.log(waveInfo);
            waveData[waveIdx]['srcPos'] = [-waveData[waveIdx]['srcSize'] * Math.cos(sumAngle), -waveData[waveIdx]['srcSize'] * Math.sin(sumAngle)];
            waveData[waveIdx]['angle'] *= angleFactor
            sumAngle += waveData[waveIdx]['angle'];
            waveData[waveIdx]['vPos'] = [-waveData[waveIdx]['vSize'] * Math.cos(sumAngle), -waveData[waveIdx]['vSize'] * Math.sin(sumAngle)];
        };
    };
};

// // get sprial info for spiralList
function getSpiral(spiralList) {
    // // scan spiral size
    let minCount = Infinity;
    let maxCount = 0;
    for (const spiralInfo of spiralList) {
        if (spiralInfo['layer'] === 1) {
            spiralInfo['edges'] = spiralInfo['lccList'][0]['edges'];
            spiralInfo['vertices'] = spiralInfo['lccList'][0]['vertices'];
        } else {
            spiralInfo['edges'] = spiralInfo['lccList'].map(d => d['edges']).reduce((prev, current) => prev + current);
            spiralInfo['vertices'] = spiralInfo['lccList'].map(d => d['vertices']).reduce((prev, current) => prev + current);
        }
        if (spiralInfo['count'] > maxCount) {
            maxCount = spiralInfo['count'];
        };
        if (spiralInfo['count'] < minCount) {
            minCount = spiralInfo['count'];
        };
        spiralInfo['aveDeg'] = aveDeg(spiralInfo);
    };
    // console.log(minCount)
    // console.log(spiralList)
    minCount = Math.log(minCount + 1);
    maxCount = Math.log(maxCount + 1);
    const angleFactor = 4 / (maxCount - minCount);
    // // scan spiral shape
    for (const spiralInfo of spiralList) {
        spiralInfo['radius'] = Math.log(spiralInfo['edges'] + 1)
        const angle = (Math.log(spiralInfo['count'] + 1) - minCount) * angleFactor + 2;
        const angleCount = angle * 16;
        const spiralR = spiralInfo['radius'] / angleCount;
        const posList = [];
        const aveDegAngle = (spiralInfo['aveDeg'] / spiralInfo['layer'] - 1) * Math.PI;
        const baseAngle = (6 - Math.ceil(angleCount - 1) / 16) * Math.PI - aveDegAngle;
        for (let i = 0; i < angleCount; i++) {
            posList.push([-spiralR * i * Math.cos((i * Math.PI / 16 + baseAngle)), spiralR * i * Math.sin((i * Math.PI / 16 + baseAngle))]);
        };
        spiralInfo['pos'] = posList
    };
};

// // break x axis by xList
function breakX(xList) {
    xList.sort((x, y) => x - y)
    // console.log(xList);

    let sumX = 0;
    let brokenX = {};
    let revBrokenX = {}
    let prevPeel = 0;

    for (const peel of xList) {
        const tempX = 1 + Math.log10(1 + Math.log10(peel - prevPeel));
        // const tempX = Math.cbrt(peel - prevPeel);
        // const tempX = Math.sqrt(1 + Math.log10(peel - prevPeel));
        sumX += tempX
        brokenX[peel] = sumX;
        revBrokenX[sumX] = peel;
        prevPeel = peel;
    }
    // console.log(brokenX);
    return [sumX, brokenX, revBrokenX];
}

// // main function to draw the map
function drawMap(datas, buildingMapControls) {
    buildingMapControls.ignoreHover = false;
    buildingMapControls.isOpen = false;

    const bucketPeel2Building = getBucketPeelBuilding(datas[1], datas[2]);
    const data = datas[0];
    const board = d3.select("#city-building-map");
    document.getElementById('city-building-map').onwheel = function(){ return false; } // disable mouse scrolling to avoid zooming confliction

    // // set the dimensions and margins of the graph
    const padMargin = { top: 0, right: 0, bottom: 0, left: 0 };
    const margin = { top: 10, right: 30, bottom: 30, left: 60 },
        width = board.node().clientWidth - margin.left - margin.right,
        height = board.node().clientHeight - margin.top - margin.bottom;

    // console.log(board.node().clientWidth)

    // // append the svg object to the body of the page 
    const boardSvg = board.append("svg")
        .attr("class", "drawingBoard")
        .attr("width", width + margin.left + margin.right + padMargin.left + padMargin.right)
        .attr("height", height + margin.top + margin.bottom + padMargin.top + padMargin.bottom)
        .style("background-color", "#222222");

    // console.log(height + margin.top + margin.bottom + padMargin.top + padMargin.bottom)

    const group = boardSvg.append("g"); // // used for scrolling

    const svg = group.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`); // // real drawing place


    // // Process Data
    // console.log(data);
    const layers = data['layers'];
    const buckets = data['buckets'];
    delete data['layers'];
    delete data['buckets'];

    const [sumX, brokenX, revBrokenX] = breakX(layers);

    let buildingWaveList = [];
    let buildingDot;
    let buildingCircle;
    let spiralDot;
    let spiralCircle;

    // Add X axis
    // Add Y axis
    const x = d3.scaleLinear()
        .domain([0, sumX])
        .range([0, width]);
    const y = d3.scaleLinear()
        .domain([0, buckets.length - 1])
        .range([height, 0]);

    // // x, y grids
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).tickValues(layers.map(d => brokenX[d])).tickSize(-height).tickFormat(""));

    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y).ticks(buckets.length - 1).tickSize(-width).tickFormat(""));

    // // x, y axis
    svg.append("g")
        .attr("class", 'axis')
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickValues(layers.map(d => brokenX[d])).tickFormat(d => revBrokenX[d]))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    svg.append("g")
        .attr("class", 'axis')
        .call(d3.axisLeft(y).ticks(buckets.length - 1));

    // console.log(Math.max(...layers))
    // console.log()

    // process data into buildings and spirals
    const [buildingList, spiralList] = splitSpiral(data, bucketPeel2Building);
    // console.log(buildingList)
    // console.log(spiralList)


    getSpeedometer(buildingList);
    getSpiral(spiralList);

    buildingWaveList = buildingList.flatMap(building => expandWave(building));
    // console.log(buildingWaveList);

    // // get size factor
    const maxBuildingWaveVSize = Math.max(...buildingWaveList.map(d => d['info']['vertices']));
    // console.log(maxBuildingWaveVSize);
    const maxBuildingVLengthSize = Math.max(...buildingList.map(d => d['maxVSize']));
    // console.log(maxBuildingVLengthSize);
    const maxBuildingESize = Math.max(...buildingList.map(d => d['lccList'][0]['edges']));
    // console.log(maxBuildingESize);
    const maxSpiralSize = Math.max(...spiralList.map(d => d['radius']));
    // console.log(maxSpiralSize);


    const cellSize = Math.min(x(1) - x(0), y(0) - y(1));
    // console.log("x, y", x(1) - x(0), y(0) - y(1))
    const buildingCircleSizeFactor = cellSize / Math.sqrt(Math.log(1 + maxBuildingESize));
    // console.log(buildingCircleSizeFactor);
    const speedometerSizeFactor = cellSize / maxBuildingVLengthSize;
    // console.log(speedometerSizeFactor);

    const spiralSizeFactor = cellSize / maxSpiralSize;
    // console.log(spiralSizeFactor);

    // // get color factor
    const aveBuildingDensity = buildingWaveList.map(d => density(d['info'])).reduce((prev, current) => prev + current) / buildingWaveList.length;
    // console.log(aveBuildingDensity)

    // Add dots
    // // add building dots
    const buildingCircleSize = buildingCircleSizeFactor * 0.5;
    const buildingDotSize = speedometerSizeFactor * 0.5;
    buildingCircle = svg.selectAll(".buildingCircle")
        .data(buildingList);
    buildingDot = svg.selectAll(".buildingDot")
        .data(buildingWaveList);

    // console.log(buildingDot)

    const buildingCircleEnter = buildingCircle.enter().append('g');
    const buildingEnter = buildingDot.enter().append('g');

    // // building stars
    buildingEnter.append("path")
        .attr("class", "buildingDot")
        .attr("fill", d => d3.rgb(...interpolateLinearly(curve(density(d['info']), aveBuildingDensity), grey2red).map(x => x * 255)))
        .attr("stroke-width", 0.01)
        .attr("stroke", "grey")
        .attr("opacity", 0.8)
        .attr("d", d => speedometerLine(d['info']['srcPos'], d['info']['vPos'], x(brokenX[d['layer']]), y(d['bucket']), buildingDotSize));
        // .append("title")
        // .text(d => `${buildingWaveTooltip(d)}\n\n${buildingFixpointTooltip(d)}`);
    
    // // building underlying circle
    buildingCircleEnter.append("circle")
        .attr("class", "buildingCircle")        
        .attr("cx", d => x(brokenX[d['layer']]))
        .attr("cy", d => y(d['bucket']))
        .attr("r", d => buildingCircleSize * Math.sqrt(Math.log(1 + d['lccList'][0]['edges'])))
        .attr("fill", "#000000")
        .attr("fill-opacity", 0)
        .attr("stroke-width", 1)
        .attr("stroke", d => d3.rgb(...interpolateLinearly(curve(density(d['lccList'][0]), aveBuildingDensity), grey2red).map(x => x * 255)))
        .attr("opacity", 0.8);
        // .append("title")
        // .text(d => `${buildingFixpointCircleTooltip(d)}`);

    // // add spiral dots
    const spiralDotSize = 0.5 * spiralSizeFactor;
    spiralCircle = svg.selectAll(".spiralCircle")
        .data(spiralList);
    spiralDot = svg.selectAll(".spiralDot")
        .data(spiralList);

    spiralCircle.remove();
    spiralDot.remove();


    // // spiral spirals
    const spiralEnter = spiralDot.enter().append('g');
    spiralEnter.append("path")
        .attr("class", "spiralDot")
        .attr("fill", "none")
        .attr("stroke-width", Math.min(2, x(1) / 8))
        .attr("stroke", d => d3.rgb(...interpolateLinearly(curve(density(d), aveBuildingDensity), grey2red).map(x => x * 255)))
        .attr("opacity", 0.8)
        .attr("d", d => spiralLine(d['pos'], x(brokenX[d['layer']]), y(d['bucket']), spiralDotSize));
        // .append("title")
        // .text(d => `${spiralCCTooltip(d)}\n\n${spiralFixpointTooltip(d)}`);

    // // spiral underlyting circles    
    const spiralCircleEnter = spiralCircle.enter().append('g');
    spiralCircleEnter.append("circle")
        .attr("class", "spiralCircle")
        .attr("cx", d => x(brokenX[d['layer']]))
        .attr("cy", d => y(d['bucket']))
        .attr("r", d => spiralDotSize * d['radius'])
        .attr("fill", "#000000")
        .attr("fill-opacity", 0)
        .attr("stroke-width", 0);
        // .append("title")
        // .text(d => `${spiralCCTooltip(d)}\n\n${spiralFixpointTooltip(d)}`);


    

    const buildingCircleEnterModal = attachModal(buildingCircleEnter, buildingMapControls);
    const buildingCircleEnterDiv = buildingCircleEnterModal.append("xhtml:div")
                    .attr("class", "map-tooltip")
                    .style("border", "solid")
                    .style("background-color", "white")
                    // .style("border-width", "3px")
                    .style("border-radius", "5px")
                    .style("padding", "10px")
                    .style("padding", "10px");

    // buildingCircleEnterSelect.append("xhtml:option").attr("value", "1").text("1");
    // buildingCircleEnterSelect.append("xhtml:option").attr("value", "2").text("2");
    // buildingCircleEnterSelect.append("xhtml:option").attr("value", "3").text("3");

    buildingCircleEnterDiv.append("xhtml:p")
            .style("margin-block-end", '0.5em')
            .text(d => `${buildingFixpointCircleTooltip(d)}`);

    const buildingCircleEnterSelect = buildingCircleEnterDiv.append("xhtml:select").style("width", "80%").style("margin-bottom", "4px").attr("class", "mapBuildingDropList");
    buildingCircleEnterSelect.each(function(d) {
            // console.log(d['lccList'][0]['waves'])
            const self = d3.select(this);
            self.append("xhtml:option").attr("value", 0).text(`all`);
            for (const [name, info] of Object.entries(d['lccList'][0]['waves'])) {
                self.append("xhtml:option").attr("value", name).text(`wave: ${name} V: ${info['vertices']} E: ${info['edges']} aveDeg: ${aveDeg(info).toFixed(2)}, density: ${density(info).toExponential(2)}`);
            }})
    
    const buildingCircleEnterButton = buildingCircleEnterDiv.append("xhtml:button").attr("class", "mapBuildingZoomButton").text("zoom in");

    // const buildingEnterModal = attachModal(buildingEnter);
    // buildingEnterModal.append("xhtml:div")
    //         .style("border", "solid")
    //         .style("background-color", "white")
    //         .style("border-width", "3px")
    //         .style("border-radius", "5px")
    //         .style("padding", "10px")
    //         .style("padding", "10px")
    //         .append("xhtml:p")
    //         .text(d => `NEW2: ${buildingWaveTooltip(d)}\n\n${buildingFixpointTooltip(d)}`);

    const spiralCircleEnterModal = attachModal(spiralCircleEnter, buildingMapControls);
    const spiralCircleEnterDiv = spiralCircleEnterModal.append("xhtml:div")
            .attr("class", "map-tooltip")
            .style("border", "solid")
            .style("background-color", "white")
            .style("border-width", "3px")
            .style("border-radius", "5px")
            .style("padding", "10px")
            .style("padding", "10px")
            

    spiralCircleEnterDiv.append("xhtml:p")
            .style("margin-block-end", '0.5em')
            .text(d => `${spiralCCTooltip(d)}\n\n${spiralFixpointTooltip(d)}`);

    const spiralCircleEnterSelect = spiralCircleEnterDiv.append("xhtml:select").style("width", "80%").style("margin-bottom", "4px").attr("class", "mapSpiralDropList");
    spiralCircleEnterSelect.each(function(d) {
            const self = d3.select(this);
            const nameListLength = d['buildingName'].length;
            // console.log(nameListLength);
            for (const [index, name] of Object.entries(d['buildingName'])) {
                if (nameListLength !== 1) {
                    if (parseInt(index) === 0) {
                        self.append("xhtml:option").attr("value", index).text(`wavemap ${name} (min)`);
                    } else if (parseInt(index) === nameListLength - 1) {
                        self.append("xhtml:option").attr("value", index).text(`wavemap ${name} (max)`);
                    } else {
                        self.append("xhtml:option").attr("value", index).text(`wavemap ${name}`);
                    }
                } else {
                    self.append("xhtml:option").attr("value", index).text(`wavemap ${name}`);
                }
            }})
        // .attr("value", d => d['buildingName'])
        // .text(d => d['buildingName'])
    
    const spiralCircleEnterButton = spiralCircleEnterDiv.append("xhtml:button").attr("class", "mapSpiralZoomButton").text("zoom in");
            
    // const spiralEnterModal = attachModal(spiralEnter);
    // spiralEnterModal.append("xhtml:div")
    //         .style("border", "solid")
    //         .style("background-color", "white")
    //         .style("border-width", "3px")
    //         .style("border-radius", "5px")
    //         .style("padding", "10px")
    //         .style("padding", "10px")
    //         .append("xhtml:p")
    //         .text(d => `NEW4: ${spiralCCTooltip(d)}\n\n${spiralFixpointTooltip(d)}`); 

    function attachModal(element, buildingMapControls){
        console.log();
        // // Add modal for any element
        const modal = element.append("foreignObject")
            .attr("id", d => buildingId(d))
            .attr("x", d => {
                let xVal = x(brokenX[d['layer']]);
                if (xVal + 500 > width){
                    xVal = xVal - 500;
                }
                return xVal;
            })
            .attr("y", d => {
                let yVal = y(d['bucket']);
                if (yVal + 100 > height){
                    yVal = yVal - 100;
                }
                if (yVal < 0) {
                    yVal = 0;
                }
                return yVal;
            })
            .attr("height", "100px")
            .attr("width", "500px")
            .attr("visibility", "hidden");

        const close = element.append('text')
            .attr("id", d => buildingId(d))
            .attr("x", d => {
                let xVal = x(brokenX[d['layer']]) + 470;
                if (xVal + 30 > width){
                    xVal = xVal - 500;
                }
                return xVal;
            })
            .attr("y", d => {
                let yVal = y(d['bucket']) + 5;
                if (yVal + 95 > height){
                    yVal = yVal - 100;
                }
                if (yVal < 5) {
                    yVal = 5;
                }
                return yVal;
            })
            .text('X')
            .attr("dominant-baseline","text-before-edge")
            .attr("font-family", "sans-serif")
            .attr("font-size", "20px")
            .style("stroke", "black")
            .style("stroke-width", "2")
            .attr("visibility", "hidden");

        close.on("click", function(){
            hideElement(buildingMapControls.intrestedElement.id, buildingMapControls);
            buildingMapControls.ignoreHover = false;
        });

        return modal;
    }

    // // tool functions for transforamtion
    function zoomed(event) {
        // console.log(event)
        const scale = event.transform.k;

        const scaledWidth = (width + margin.left + margin.right + padMargin.left + padMargin.right) * scale;
        const scaledHeight = (height + margin.top + margin.bottom + padMargin.top + padMargin.bottom) * scale;

        // Change SVG dimensions.
        boardSvg.attr("width", scaledWidth).attr("height", scaledHeight);

        // Scale the image itself.
        group.attr("transform", `scale(${scale})`);

        // Move scrollbars.
        board.node().scrollLeft = -event.transform.x;
        board.node().scrollTop = -event.transform.y;

        // If the image is smaller than the wrapper, move the image towards the
        // center of the wrapper.
        const dx = d3.max([0, board.node().clientWidth / 2 - scaledWidth / 2]);
        const dy = d3.max([0, board.node().clientHeight / 2 - scaledHeight / 2]);
        boardSvg.attr('transform', `translate(${dx}, ${dy})`);


        updateSize(buildingMapControls);

    };

    function scrolled(event) {
        // console.log(event)
        const x = board.node().scrollLeft + board.node().clientWidth / 2;
        const y = board.node().scrollTop + board.node().clientHeight / 2;
        const scale = d3.zoomTransform(board.node()).k;
        // console.log(board.node().scrollTop)
        // console.log(board.node().clientHeight)
        // console.log(d3.zoom())
        // Update zoom parameters based on scrollbar positions.
        board.call(d3.zoom().translateTo, x / scale, y / scale);
    };

    // Set up d3-zoom and callbacks.
    board.on('scroll', scrolled)
        .call(d3.zoom()
            .scaleExtent([1, 10])
            .translateExtent([[0, 0], [width + margin.left + margin.right + padMargin.left + padMargin.right, height + margin.top + margin.bottom + padMargin.top + padMargin.bottom]])
            .on('zoom', zoomed))
};

// function readAndDrawMap(name) {
//     d3.json(`${name}-lccWaves.b.p.json`).then(data => drawMap(data));
// };
function updateSize(buildingMapControls) {        
    //const scale = d3.zoomTransform(parent).k;
    const board = d3.select("#city-building-map");

    const margin = { top: 10, right: 30, bottom: 30, left: 60 },
        width = board.node().clientWidth - margin.left - margin.right,
        height = board.node().clientHeight - margin.top - margin.bottom;
    const scale = d3.zoomTransform(board.node()).k;

    const parent = d3.select(buildingMapControls.intrestedElement.id).select(function() { return this.parentNode; });
    const fObjGetX = parent.select("circle").attr("cx");
    const fObjGetY = parent.select("circle").attr("cy");

    const intrestedForiegnObject = parent.select("foreignObject");
    const intrestedClose = parent.select("text");
    
    const notScale = 1/scale;
            
    intrestedForiegnObject.attr("transform", `scale(${notScale})`);
    intrestedForiegnObject.attr("x", d => {
        let xVal = parseFloat(fObjGetX) * scale;
        if (xVal + 500 > width){
            xVal = xVal - 500;
        }
        return xVal;
    });
    intrestedForiegnObject.attr("y", d => {
        let yVal = parseFloat(fObjGetY) * scale;
        if (yVal + 100 > height){
            yVal = yVal - 100;
        }
        if (yVal < 0) {
            yVal = 0;
        }
        return yVal;
    });

    intrestedClose.attr("transform", `scale(${notScale})`);
    intrestedClose.attr("x", d => {
        let xVal = (parseFloat(fObjGetX) * scale) + 470;
        if (xVal + 30 > width){
            xVal = xVal - 500;
        }
        return xVal;
    });    
    intrestedClose.attr("y", d => {
        let yVal = (parseFloat(fObjGetY) * scale) + 5;
        if (yVal + 95 > height){
            yVal = yVal - 100;
        }
        if (yVal < 5) {
            yVal = 5;
        }
        return yVal;
    });
    return;
}


// Pass Id to toggle visibility
function showElement(elementID, buildingMapControls){    
    buildingMapControls.isOpen = true;
    d3.selectAll(elementID)
        .attr("visibility", "visible");
    updateSize(buildingMapControls);
}

function hideElement(elementID, buildingMapControls){
    buildingMapControls.isOpen = false;
    d3.selectAll(elementID)
        .attr("visibility", "hidden");
    updateSize(buildingMapControls);
}

function updateIntrestedElement(data, buildingMapControls){
    // console.log(buildingMapControls);
    buildingMapControls.intrestedElement = {
        id: `#b${data['bucket']}l${data['layer']}`,
        bucket: data['bucket'],
        layer: data['layer']
    }
    return buildingMapControls.intrestedElement;
}

// // event handlers
function handleMouseOverAPI(selectedDot, data) {
    console.log('over: ', selectedDot);
};
function handleMouseOver(selectedDot, data, buildingMapControls, APIFunc) {
    // console.log('over', selectedDot);
    
    if(!buildingMapControls.isOpen){
        updateIntrestedElement(data, buildingMapControls);
        showElement(buildingMapControls.intrestedElement.id, buildingMapControls);
    }

    APIFunc(selectedDot, data);
}

function handleMouseOutAPI(selectedDot, data) {
    console.log('out: ', selectedDot);
};
function handleMouseOut(selectedDot, data, buildingMapControls, APIFunc) {
    // console.log('out', selectedDot);
    
    if (typeof buildingMapControls.ignoreHover !== 'undefined'){
        if (!buildingMapControls.ignoreHover){
            hideElement(buildingMapControls.intrestedElement.id, buildingMapControls);            
        }
    }else{
        hideElement(buildingMapControls.intrestedElement.id, buildingMapControls);
    }

    APIFunc(selectedDot, data);
}

function handleLeftClickAPI(selectedDot, data) {
    console.log('Clicked on: ', selectedDot);
};
function handleLeftClick(selectedDot, data, buildingMapControls, APIFunc) {
    // console.log('Clicked on: ', selectedDot);

    if (typeof buildingMapControls.intrestedElement !== 'undefined'){
        hideElement(buildingMapControls.intrestedElement.id, buildingMapControls);        
    }

    updateIntrestedElement(data, buildingMapControls);  
    buildingMapControls.ignoreHover = true;  
    showElement(buildingMapControls.intrestedElement.id, buildingMapControls);
    
    APIFunc(selectedDot, data);
}

// // process selection events
function processSelection(event, data, handleSelectionFnc, buildingMapControls, APIFunc) {
    // console.log(event);
    // console.log(data);
    const selectedDot = {'bucket': data['bucket'], 'layer': data['layer']}
    handleSelectionFnc(selectedDot, data, buildingMapControls, APIFunc);
};

// // add event handlers
function addOnMouseOver(APIFunc, buildingMapControls) {
    const svg = d3.select("#city-building-map svg g g");
    const buildingDot = svg.selectAll(".buildingDot");
    const spiralDot = svg.selectAll(".spiralDot");
    const builidngCircle = svg.selectAll(".buildingCircle");
    const spiralCircle = svg.selectAll(".spiralCircle");

    buildingDot.on('mouseover', (e, d) => processSelection(e, d, handleMouseOver, buildingMapControls, APIFunc));
    spiralDot.on('mouseover', (e, d) => processSelection(e, d, handleMouseOver, buildingMapControls, APIFunc));
    builidngCircle.on('mouseover', (e, d) => processSelection(e, d, handleMouseOver, buildingMapControls, APIFunc));
    spiralCircle.on('mouseover', (e, d) => processSelection(e, d, handleMouseOver, buildingMapControls, APIFunc));
    // console.log('here', buildingDot);
}

function addOnMouseOut(APIFunc, buildingMapControls) {
    const svg = d3.select("#city-building-map svg g g");
    const buildingDot = svg.selectAll(".buildingDot");
    const spiralDot = svg.selectAll(".spiralDot");
    const builidngCircle = svg.selectAll(".buildingCircle");
    const spiralCircle = svg.selectAll(".spiralCircle");

    buildingDot.on('mouseout', (e, d) => processSelection(e, d, handleMouseOut, buildingMapControls, APIFunc));
    spiralDot.on('mouseout', (e, d) => processSelection(e, d, handleMouseOut, buildingMapControls, APIFunc));
    builidngCircle.on('mouseout', (e, d) => processSelection(e, d, handleMouseOut, buildingMapControls, APIFunc));
    spiralCircle.on('mouseout', (e, d) => processSelection(e, d, handleMouseOut, buildingMapControls, APIFunc));
    // console.log('here', buildingDot);
}

function addOnLeftClick(APIFunc, buildingMapControls) {
    const svg = d3.select("#city-building-map svg g g");
    const buildingDot = svg.selectAll(".buildingDot");
    const spiralDot = svg.selectAll(".spiralDot");
    const builidngCircle = svg.selectAll(".buildingCircle");
    const spiralCircle = svg.selectAll(".spiralCircle");

    buildingDot.on('click', (e, d) => processSelection(e, d, handleLeftClick, buildingMapControls, APIFunc));
    spiralDot.on('click', (e, d) => processSelection(e, d, handleLeftClick, buildingMapControls, APIFunc));
    builidngCircle.on('click', (e, d) => processSelection(e, d, handleLeftClick, buildingMapControls, APIFunc));
    spiralCircle.on('click', (e, d) => processSelection(e, d, handleLeftClick, buildingMapControls, APIFunc));
    // console.log('here', buildingDot);
}


function getBucketPeelBuilding (bucket2Building, building2Peel) {
    const bucketPeel2Building = {}
    // console.log(bucket2Building, building2Peel);
    for (const [bucket, subBucket2Building] of Object.entries(bucket2Building)) {
        for (const [subBucket, building] of Object.entries(subBucket2Building)) {
            const peelList = building2Peel[building];
            if (!(bucketPeel2Building.hasOwnProperty(bucket))) {
                bucketPeel2Building[bucket] = {};
            }
            const tempBucket = bucketPeel2Building[bucket];
            // console.log(building);
            // console.log(peelList);
            for (const peel of peelList) {
                if (!(tempBucket.hasOwnProperty(peel))) {
                    tempBucket[peel] = [];
                };
                tempBucket[peel].push(building);
            };
        };
    };
    // console.log(bucketPeel2Building);
    return bucketPeel2Building;
}


// main call
// const buildingMap_file = 'movies-lccWaves.b.p.json';
// d3.json(buildingMap_file).then(data => drawMap(data, buildingMapControls)).then(() => addOnMouseOver(handleMouseOverAPI, buildingMapControls)).then(() => addOnMouseOut(handleMouseOutAPI, buildingMapControls)).then(() => addOnLeftClick(handleLeftClickAPI, buildingMapControls));

export {drawMap, addOnMouseOver, addOnMouseOut, addOnLeftClick};