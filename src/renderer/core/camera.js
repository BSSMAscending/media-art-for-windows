async function getCameraDevices(selectEl) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((d) => d.kind === 'videoinput');

    selectEl.innerHTML = '';

    if (cameras.length === 0) {
      selectEl.innerHTML = '<option value="">카메라를 찾을 수 없습니다</option>';
      return cameras;
    }

    selectEl.innerHTML = '<option value="">기본 카메라</option>';
    cameras.forEach((cam, idx) => {
      const opt = document.createElement('option');
      opt.value = cam.deviceId;
      opt.textContent = cam.label || `카메라 ${idx + 1}`;
      selectEl.appendChild(opt);
    });

    return cameras;
  } catch (err) {
    console.error('Failed to get camera devices:', err);
    selectEl.innerHTML = '<option value="">카메라 권한이 필요합니다</option>';
    return [];
  }
}

async function openCameraStream(deviceId) {
  const constraints = {
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
  };

  if (deviceId) {
    constraints.video.deviceId = { exact: deviceId };
  } else {
    constraints.video.facingMode = 'user';
  }

  return navigator.mediaDevices.getUserMedia(constraints);
}

module.exports = { getCameraDevices, openCameraStream };
