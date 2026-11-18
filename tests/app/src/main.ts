import { mount } from "svelte";
import "./lib/hmi/core/hmi.css";
import "./lib/hmi/hmi-motion.css";
import Root from "./Root.svelte";
mount(Root, { target: document.getElementById("app")! });
