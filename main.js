const { entrypoints } = require("uxp");
const { action, app, core } = require("photoshop");

const eventTypes = ["set", "addTo", "subtractFrom", "interfaceWhite"];

const colorPickerEvents = ["toolModalStateChanged"];

const onUndoDetected = async (event, descriptor) => {
    const settings = getSettings();
    if (!settings.enabled) return;
    // 1. Check if the event is a History Change
    // console.warn("Undo detected");
    // if (event !== "historyStateChanged") return;

    // 2. Identify the Undo command (ID 101)
    // Note: Some versions of PS use 101 for Undo and 102 for Redo
    const data = typeof descriptor.toObject === "function" ? descriptor.toObject() : descriptor;
    // console.warn("Event Data:", JSON.stringify(descriptor, null, 4));
    const isUndo = data.commandID === 101;
    // console.warn("Undo detected");
    
    if (isUndo) {
        console.warn("Undo detected");
        try{
            const doc = app.activeDocument;
            const historyStates = doc.historyStates;
            let currentIndex = historyStates.findIndex(h => h._id === doc.activeHistoryState._id);
            await core.executeAsModal(async (context) => {

                // app.activeDocument.historyStates.forEach(h => console.warn(h._id, h.name));

                // const currentState = doc.activeHistoryState; // should be lasso
                // const lastState = historyStates[historyStates.length - 1]; // should be lasso fill



                console.warn(`Pointer is at index: ${currentIndex} (${doc.activeHistoryState.name})`);
                
                if (currentIndex < historyStates.length - 1) {
                    const stateWeJustUndid = historyStates[currentIndex + 1];
                    const currentState = historyStates[currentIndex];

                    console.warn(`State just undid: ${stateWeJustUndid.name}`);

                    // 3. The Logic: If we are now on "Lasso" and we just undid "Lasso Fill"
                    if (currentState.name === "Lasso" && stateWeJustUndid.name === "Lasso Fill") {
                        console.warn("Detected Undo of Lasso Fill. Rolling back to state before Lasso.");


                        console.warn(`Current index before rollback: ${currentIndex} (${doc.activeHistoryState.name})`);
                        // Go back one more step (CurrentIndex - 1)
                        // Ensure we aren't at the very top of the history stack (index 0)
                        if (currentIndex > 0) {
                            // await action.batchPlay([{
                            //     _obj: "invokeCommand",
                            //     commandID: 101 // Native Undo
                            // }], {});
                            // await action.batchPlay([
                            //     {
                            //         _obj:"invokeCommand",commandID:101
                            //     }
                            // ], { synchronousExecution: true });


                            // await app.activeDocument.suspendHistory(async () => {
                                doc.activeHistoryState = historyStates[currentIndex - 1];
                                // await action.batchPlay([{ _obj: "invokeCommand", commandID: 101 }, { _obj: "invokeCommand", commandID: 101 }], {});
                                // await action.batchPlay([{ _obj: "invokeCommand", commandID: 101 }], {});
                                // currentIndex = historyStates.findIndex(h => h._id === doc.activeHistoryState._id);
                                // console.warn(`Rolled back one more step to index: ${currentIndex} (${doc.activeHistoryState.name})`);
                            // }, "Rolling back Lasso"); // Name this action for clarity in History
                            // doc.activeHistoryState = historyStates[historyStates.length - 2];

                        } else {
                            // If the Lasso was the very first thing done, we can't go back further,
                            // but we could technically "Reset" or just clear selection.
                            console.warn("Lasso was the first state. Nowhere to roll back to.");
                        }
                    } else{
                        // if (currentState.name === "Rolling back Lasso") {
                        //     console.warn("Undoing the rollback of Lasso. Moving forward to Lasso Fill.");
                        // }
                    }
                }
                // console.warn("Current History State:", historyStates[historyStates.length - 1].name);
                // console.warn("active history state index:", JSON.stringify(doc.activeHistoryState));

                // if (currentState.name === "Lasso" && lastState.name === "Lasso Fill") {
                //     console.warn("Undo detected on a Lasso Fill. Removing the Lasso too...");
                //     doc.activeHistoryState = historyStates[historyStates.length - 3]; // Go back one more step to remove the Lasso
                // }
            }, { "commandName": "Undoing Lasso Fill..." });
        } catch (e) {
            console.error("Undoing Lasso Fill failed:", e);
        } finally {
            isProcessing = false; // LOCK OFF - Always runs even if code crashes
        }




    //     // 3. Check the name of the state we are currently on or just left
    //     // If the user undid "Lasso Fill", and the resulting state is "Lasso"
    //     if (descriptor.name === "Lasso") {
    //         console.warn("Undo detected on a Lasso Fill. Removing the Lasso too...sdf");
            
    //         // // We must wrap the second undo in a modal scope
    //         // await core.executeAsModal(async () => {
    //         //     await action.batchPlay([{
    //         //         _obj: "invokeCommand",
    //         //         commandID: 101 // Trigger the second undo
    //         //     }], {});
    //         // }, { "commandName": "Auto-Clean Lasso" });
    //     }
    }
};


// action.addNotificationListener(["invokeCommand"], onUndoDetected);
const colorPick = async (event, descriptor) => {
    const settings = getSettings();
    if (!settings.enabled) return;
    // 1. Check if the event is a History Change
    // console.warn("Undo detected");
    // if (event !== "historyStateChanged") return;

    // 2. Identify the Undo command (ID 101)
    // Note: Some versions of PS use 101 for Undo and 102 for Redo
    const data = typeof descriptor.toObject === "function" ? descriptor.toObject() : descriptor;
    console.warn("Event Data:", JSON.stringify(descriptor, null, 4));

};

// action.addNotificationListener(["toolModalStateChanged"], colorPick);

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
        isProcessing = true;
        const isDeselect = data.to?._value === "none";
        if (isDeselect) return;
        
        await core.executeAsModal(async (context) => {
            const settings = getSettings();
            if (!settings.enabled) return;

            const selectionBounds = app.activeDocument.selection.bounds;

            const layer = app.activeDocument.activeLayers[0];

            const preserveTransparency =
                layer.transparentPixelsLocked === true;

            if (selectionBounds == null) {
                console.warn("Selection too small, skipping fill.");
                return; 
            }

            // 2. Wrap everything in suspendHistory
            // This is what makes it a single Undo step
            console.warn("Filling selection with opacity:", settings.opacity, "and blend mode:", JSON.stringify(settings.blendMode));
            console.warn("fill mode:", JSON.stringify(settings.fillMode));
            await app.activeDocument.suspendHistory(async () => {
                
                await action.batchPlay([
                    {
                        _obj: "fill",
                        mode: { _enum: "blendMode", _value: settings.blendMode},
                        opacity: { _unit: "percentUnit", _value: settings.opacity },
                        preserveTransparency: preserveTransparency,
                        using: { _enum: "fillContents", _value: settings.fillMode }
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
        opacity: parseInt(document.getElementById("opacitySlider").value) || 0,
        blendMode: document.getElementById("blendMode").value || "normal",
        fillMode: document.getElementById("fillMode").value || "foregroundColor"
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

