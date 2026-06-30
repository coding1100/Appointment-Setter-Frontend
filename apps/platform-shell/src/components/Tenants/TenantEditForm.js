import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Loader2, Mail } from "lucide-react";

import { tenantAPI } from "../../services/api";
import Loader from "../Loader";
import { NAVY } from "../Platform/WorkspaceShellLayout";
import { getAppName } from "../../utils/appName";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 focus:border-[#68fadd]/50 focus:outline-none focus:ring-2 focus:ring-[#68fadd]/20";

const fieldErrorClass =
  "border-rose-300 focus:border-rose-400 focus:ring-rose-200/50";

const TenantEditForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    owner_email: "",
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    owner_email: "",
  });

  useEffect(() => {
    const fetchTenant = async () => {
      if (!id) {
        setError("Tenant ID is required");
        setFetching(false);
        return;
      }

      try {
        setFetching(true);
        setError("");
        const response = await tenantAPI.getTenant(id);
        const tenant = response.data;

        setFormData({
          name: tenant.name || "",
          owner_email: tenant.owner_email || "",
        });
      } catch (fetchError) {
        const errorDetail = fetchError.response?.data?.detail;
        setError(
          typeof errorDetail === "string"
            ? errorDetail
            : "Failed to fetch tenant",
        );
      } finally {
        setFetching(false);
      }
    };

    fetchTenant();
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({ name: "", owner_email: "" });

    try {
      await tenantAPI.updateTenant(id, formData);
      navigate(`/app/appointment-setter/tenants/${id}`);
    } catch (submitError) {
      const errorDetail = submitError.response?.data?.detail;
      const statusCode = submitError.response?.status;

      if (
        statusCode === 400 ||
        statusCode === 409 ||
        (errorDetail && typeof errorDetail === "string")
      ) {
        const errorMessage =
          typeof errorDetail === "string"
            ? errorDetail
            : submitError.response?.data?.message || "Failed to update tenant";
        const lowerMessage = errorMessage.toLowerCase();

        if (
          lowerMessage.includes("duplicate") ||
          lowerMessage.includes("already exists") ||
          lowerMessage.includes("unique constraint")
        ) {
          if (
            lowerMessage.includes("owner_email") ||
            lowerMessage.includes("email")
          ) {
            setError(
              "A tenant with this owner email already exists. Please choose a different email.",
            );
            setFieldErrors({
              name: "",
              owner_email: "This owner email is already in use.",
            });
          } else {
            setError(
              "A tenant with this name already exists. Please choose a different name.",
            );
            setFieldErrors({
              name: "This tenant name is already in use.",
              owner_email: "",
            });
          }
        } else {
          setError(errorMessage);
        }
      } else if (Array.isArray(errorDetail)) {
        const errorMessages = errorDetail
          .map((entry) => `${entry.loc?.join(".")} - ${entry.msg}`)
          .join(", ");
        setError(errorMessages);
      } else {
        setError(
          typeof errorDetail === "string"
            ? errorDetail
            : "Failed to update tenant. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader message="Loading tenant..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate(`/app/appointment-setter/tenants/${id}`)}
          className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          aria-label="Back to customer profile"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Tenant setup
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight" style={{ color: NAVY }}>
            Edit tenant
          </h1>
          <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
            Update tenant identity details in {getAppName()}.
          </p>
        </div>
      </div>

      <div className="max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <form onSubmit={handleSubmit} className="p-5 sm:p-6">
          {error ? (
            <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          ) : null}

          <div className="space-y-5">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-800">
                Tenant name *
              </label>
              <div className="relative">
                <Building2
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  strokeWidth={1.75}
                />
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter tenant name"
                  className={`${fieldClass} ${fieldErrors.name ? fieldErrorClass : ""}`}
                />
              </div>
              <p
                className={`mt-1.5 text-xs ${fieldErrors.name ? "text-rose-600" : "text-slate-500"}`}
              >
                {fieldErrors.name || "Display name for this customer tenant."}
              </p>
            </div>

            <div>
              <label
                htmlFor="owner_email"
                className="mb-1.5 block text-sm font-medium text-slate-800"
              >
                Owner email *
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  strokeWidth={1.75}
                />
                <input
                  type="email"
                  name="owner_email"
                  id="owner_email"
                  required
                  value={formData.owner_email}
                  onChange={handleChange}
                  placeholder="Enter owner email"
                  className={`${fieldClass} ${fieldErrors.owner_email ? fieldErrorClass : ""}`}
                />
              </div>
              <p
                className={`mt-1.5 text-xs ${fieldErrors.owner_email ? "text-rose-600" : "text-slate-500"}`}
              >
                {fieldErrors.owner_email ||
                  "Receives ownership-related notifications."}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(`/app/appointment-setter/tenants/${id}`)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: NAVY }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TenantEditForm;
