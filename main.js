const { entrypoints } = require("uxp");
const { action, app, core } = require("photoshop");

const eventTypes = ["set", "addTo", "subtractFrom", "interfaceWhite"];

const slider = document.getElementById("opacitySlider");
const input = document.getElementById("opacityInput");

console.warn("starting up");

let isProcessing = false; 

const onLasso = async (event, descriptor) => {

    if (isProcessing) return;
    
    const data = typeof descriptor.toObject === "function" ? descriptor.toObject() : descriptor;

    // 2. Check if the target is the 'selection'
    const isSelection = data._target?.some(t => t._property === "selection" || t._ref === "channel");
    if (!isSelection) return;
    
    // console.warn("Event Data:", JSON.stringify(descriptor, null, 4));
    try {
        isProcessing = true; // LOCK ON
        const isDeselect = data.to?._value === "none";
        if (isDeselect) return;
        
        await core.executeAsModal(async (context) => {
            const settings = getSettings();
            if (!settings.enabled) return;

            // 2. Wrap everything in suspendHistory
            // This is what makes it a single Undo step
            await app.activeDocument.suspendHistory(async () => {
                
                await action.batchPlay([
                    {
                        _obj: "fill",
                        mode: { _enum: "blendMode", _value: "normal" },
                        opacity: { _unit: "percentUnit", _value: settings.opacity },
                        using: { _enum: "fillContents", _value: "foregroundColor" }
                    },
                    {
                        _obj: "set",
                        _target: [{ _property: "selection", _ref: "channel" }],
                        to: { _enum: "ordinal", _value: "none" }
                    }
                ], { synchronousExecution: true });

            }, "Lasso Fill"); // This becomes the name in the History panel

        }, { "commandName": "Processing Lasso..." });
    } catch (e) {
        console.error("Lasso Fill failed:", e);
    } finally {
        isProcessing = false; // LOCK OFF - Always runs even if code crashes
    }
};

// action.addNotificationListener(eventTypes, onLasso);

// action.removeNotificationListener(eventTypes, onLasso);

// slider → input (real-time)b
slider.addEventListener("change", () => {
  input.value = String(slider.value);
});

// input → slider (ONLY when user finishes typing)
input.addEventListener("change", () => {
  let val = parseInt(input.value);

  if (isNaN(val)) val = 0;
  if (val < 0) val = 0;
  if (val > 100) val = 100;

  input.value = String(val);;
  slider.value = val;
});

async function fillAndDeselect() {
  const settings = getSettings();
  if (!settings.enabled) return;
  console.warn("Lasso event detected, filling with opacity:", settings.opacity);

  // Use commandName to force the two actions into ONE History state
  return await core.executeAsModal(async () => {
    console.warn("Executing fill and deselect as modal...");
      await action.batchPlay([
          {
              _obj: "fill",
              mode: { _enum: "blendMode", _value: "normal" },
              opacity: { _unit: "percentUnit", _value: settings.opacity },
              using: { _enum: "fillContents", _value: "foregroundColor" }
          },
          {
              _obj: "set",
              _target: [{ _property: "selection", _ref: "channel" }],
              to: { _enum: "ordinal", _value: "none" }
          }
      ], { synchronousExecution: true });
  }, { "commandName": "Lasso Auto-Fill" });

  // return await action.batchPlay([
  //   {_obj:"fill",
  //     mode:{
  //         _enum:"blendMode",
  //         _value:"normal"
  //       },
  //      opacity:{
  //         "_unit":"percentUnit",
  //         "_value": settings.opacity
  //       },
  //      using:{
  //           _enum:"fillContents",
  //            _value:"foregroundColor"
  //       }
  //   },
  //   {_obj:"set",_target:[{_property:"selection",_ref:"channel"}],to:{_enum:"ordinal",_value:"none"}}
  //   ], {});
}

const enabledCheckbox = document.getElementById("enabled");

// function getSettings() { 
//   return {
//     enabled: enabledCheckbox.checked,
//     opacity: parseInt(document.getElementById("opacitySlider").value),
//     // blendMode: document.getElementById("blendMode").value,
//     // fillMode: document.getElementById("fillMode").value
//   };
// }


function getSettings() { 
    return {
        enabled: enabledCheckbox.checked,
        opacity: parseInt(document.getElementById("opacitySlider").value) || 0
    };
}
// document.getElementById("enabled").addEventListener("change", (e) => {
//     const isChecked = e.target.checked;
    
//     if (isChecked) {
//         action.addNotificationListener(eventTypes, onLasso);
//         console.error("Lasso Monitor Enabled");
//     } else {
//         action.removeNotificationListener(eventTypes, onLasso);
//         console.error("Lasso Monitor Disabled");
//     }
// });

const updateListenerState = (isEnabled) => {
    if (isEnabled) {
        action.addNotificationListener(eventTypes, onLasso);
        console.log("Lasso Monitor Enabled");
    } else {
        action.removeNotificationListener(eventTypes, onLasso);
        console.log("Lasso Monitor Disabled");
    }
};

// Sync checkbox on click
enabledCheckbox.addEventListener("change", (e) => {
    updateListenerState(e.target.checked);
});

updateListenerState(enabledCheckbox.checked);