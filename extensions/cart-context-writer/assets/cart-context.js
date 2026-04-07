(function rtCartContextWriter() {
  function isFlatPayload(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function toAttributeValue(value) {
    if (value == null) {
      return null;
    }

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    return null;
  }

  async function writeCartContextAttributes() {
    try {
      var contextResponse = await fetch("/apps/rt/cart-context", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });

      if (!contextResponse.ok) {
        return;
      }

      var payload = await contextResponse.json();
      if (!isFlatPayload(payload)) {
        return;
      }

      var attributes = {};
      Object.keys(payload).forEach(function copySupportedValues(key) {
        var attributeValue = toAttributeValue(payload[key]);
        if (attributeValue === null) {
          return;
        }

        attributes[key] = attributeValue;
      });

      if (Object.keys(attributes).length === 0) {
        return;
      }

      var updateResponse = await fetch("/cart/update.js", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          attributes: attributes,
        }),
      });

      if (!updateResponse.ok) {
        return;
      }
    } catch (_error) {
      // silent no-op by design
    }
  }

  void writeCartContextAttributes();
})();
