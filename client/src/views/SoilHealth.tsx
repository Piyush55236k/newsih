import React, { useState } from "react";

export default function SoilHealth() {
  const [form, setForm] = useState({
    crop: "",
    N: "0",
    P: "0",
    K: "0",
    S: "0",
    Zn: "0",
    Fe: "0",
    Cu: "0",
    Mn: "0",
    B: "0",
    OC: "0",
    pH: "7.0",
    EC: "0"
  });

  const [aiResponse, setAiResponse] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiLoading(true);
    setAiError(null);

    // ✅ Validate inputs before sending
    for (const [key, val] of Object.entries(form)) {
      if (key === "crop") {
        if (!val.trim()) {
          setAiError("Please enter a crop name");
          setAiLoading(false);
          return;
        }
      } else {
        if (val === "" || isNaN(Number(val))) {
          setAiError(`Please enter a valid number for ${key}`);
          setAiLoading(false);
          return;
        }
      }
    }

    try {
      const res = await fetch("http://localhost:8080/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          crop: form.crop,
          soil: {
            N: parseFloat(form.N),
            P: parseFloat(form.P),
            K: parseFloat(form.K),
            S: parseFloat(form.S),
            Zn: parseFloat(form.Zn),
            Fe: parseFloat(form.Fe),
            Cu: parseFloat(form.Cu),
            Mn: parseFloat(form.Mn),
            B: parseFloat(form.B),
            OC: parseFloat(form.OC),
            pH: parseFloat(form.pH),
            EC: parseFloat(form.EC)
          }
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Server error");
      }

      setAiResponse(data.data);
    } catch (err: any) {
      setAiError(err.message || "Unexpected error occurred");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="soil-health">
      <h2>Soil Health & Fertilizer Recommendation</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Crop:</label>
          <input
            type="text"
            name="crop"
            value={form.crop}
            onChange={handleChange}
            required
          />
        </div>

        {[
          "N",
          "P",
          "K",
          "S",
          "Zn",
          "Fe",
          "Cu",
          "Mn",
          "B",
          "OC",
          "pH",
          "EC"
        ].map((field) => (
          <div key={field}>
            <label>{field}:</label>
            <input
              type="number"
              step="any"
              name={field}
              value={form[field as keyof typeof form]}
              onChange={handleChange}
              required
            />
          </div>
        ))}

        <button type="submit" disabled={aiLoading}>
          {aiLoading ? "Loading..." : "Get Recommendation"}
        </button>
      </form>

      {aiError && <p style={{ color: "red" }}>{aiError}</p>}

      {aiResponse && (
        <div className="results">
          <h3>Recommendations:</h3>
          <pre>{JSON.stringify(aiResponse.recommendations, null, 2)}</pre>
          <h3>Doses:</h3>
          <pre>{JSON.stringify(aiResponse.doses, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
