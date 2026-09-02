export async function processTriageAudio(
  base64Audio: string,
  mimeType: string,
  patientNameHint?: string
) {
  const response = await fetch("/api/triage/process-audio", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      base64Audio,
      mimeType,
      patientNameHint,
    }),
  });

  const responseText = await response.text();
  let data: any = {};
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Server error (${response.status}): Unexpected response format. ${responseText.slice(0, 120)}`
    );
  }

  if (!response.ok || !data.success || !data.triageData) {
    const errorMsg = data.message || `Server error during triage analysis (${response.status})`;
    throw new Error(errorMsg);
  }

  return data.triageData;
}

