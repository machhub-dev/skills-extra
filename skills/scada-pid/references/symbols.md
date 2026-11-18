# P&ID symbols

Equipment follows ISO 10628 shapes; instruments follow ISA-5.1 bubbles and letters. Every symbol must be fitted to the contract (`scada-assets`) before a screen binds it.

## Equipment: where to get it

| Equipment | Example in `scada-assets` | FUXA (`fuxa`) | Equinor (`equinor`) |
|---|---|---|---|
| Centrifugal pump | `pump-centrifugal` | `pumpcentri1`, `pumpcentri2` | `PP001A` |
| Other pumps | | `pumpgear`, `pumpscreew`, `pumpperis`, `pumpvacuum`, `pumpjet` | `PP002A` to `PP007A` |
| Gate, globe and other valves | `valve-gate` | `valve-ax`, `valve-bx`, `valve-cx` | `PV005A` and the other `PV` codes |
| Vertical tank, vessel | `tank-vertical` | `tank1` to `tank9` | `PT002A`, `PT005A`, `PT006A` |
| Agitator | | `agitator-paddle`, `agitator-prop`, `agitator-turbo`, `agitator-disc` | `PA007A`, `PA008A` |
| Heat exchanger | | `exchanger1` to `exchanger9`, `exchanger-tube` | |
| Compressor, blower | | `compressor-fan`, `compressor-piston`, `compscrew`, `pumpblower` | |
| Separator, filter | | `filter2`, `filter3`, `centrifuge1` to `4` | `PS005A`, `PS006A`, `PS007A` |
| Motor | | `motor-simb` | |

`node fetch-symbols.mjs equinor` fetches all 55 Equinor symbols to browse; their file names are Equinor's codes.

## Instruments: ISA-5.1 letters

The first letter is the measured variable; the following letters are what the instrument does.

| First letter | Variable | | Following letter | Function |
|---|---|---|---|---|
| A | Analysis | | A | Alarm |
| F | Flow | | C | Controller |
| L | Level | | I | Indicator |
| P | Pressure | | R | Recorder |
| S | Speed | | S | Switch |
| T | Temperature | | T | Transmitter |
| W | Weight | | V | Valve, final element |
| Z | Position | | Y | Relay, compute |

So `LT-101` is a level transmitter in loop 101, `FIC-102` a flow indicating controller, `PSH-103` a high pressure switch. The loop number is shared by everything in one control loop.

| Bubble | Meaning |
|---|---|
| Circle | Field mounted |
| Circle with a line | Panel in the control room |
| Circle in a square | Shared display or DCS: the usual case for a value on a MACHHUB screen |
