import { useState, useRef, useEffect, useCallback } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

const STORE_CATEGORIES = [
  "Produce","Meat & Seafood","Dairy & Eggs","Bakery & Bread",
  "Pantry & Dry Goods","Canned & Jarred","Frozen Foods","Beverages",
  "Snacks & Chips","Condiments & Sauces","Spices & Seasonings","Deli",
  "Health & Wellness","Other",
];
const UNITS = [
  "—",
  // Volume
  "tsp","tbsp","fl oz","cup","pt","qt","gal",
  // Weight
  "oz","lb","g","kg",
  // Count
  "whole","clove","slice","piece","sprig","bunch","head","stalk","can","jar","pkg",
  // Other
  "pinch","dash","to taste",
];

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const STAPLES_LIST = [
  { name: "Milk", qty: "1", unit: "gal", category: "Dairy & Eggs" },
  { name: "Bread", qty: "1", unit: "pkg", category: "Bakery & Bread" },
  { name: "Creamer", qty: "1", unit: "pkg", category: "Dairy & Eggs" },
  { name: "Cheese Pizza Lunchables", qty: "4", unit: "pkg", category: "Deli" },
  { name: "Cheez-Its", qty: "1", unit: "pkg", category: "Snacks & Chips" },
  { name: "Cheetos", qty: "1", unit: "pkg", category: "Snacks & Chips" },
  { name: "BBQ Chips", qty: "1", unit: "pkg", category: "Snacks & Chips" },
  { name: "Cheese Sticks", qty: "1", unit: "pkg", category: "Dairy & Eggs" },
  { name: "Fiber One Bars", qty: "1", unit: "pkg", category: "Health & Wellness" },
  { name: "Bananas", qty: "1", unit: "bunch", category: "Produce" },
  { name: "Grapes", qty: "1", unit: "pkg", category: "Produce" },
];

const WEEKEND_DAYS = ["Saturday","Sunday"];
const WEEKEND_MEALS = ["Breakfast","Lunch","Dinner"];
const WEEKDAY_MEALS = ["Dinner"];
const DINE_OUT_ID = "DINE_OUT";
const CHECK_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

const SAMPLE_RESTAURANTS = [
  "Parry's Pizza","Applebee's","Buffalo Wild Wings","Chili's","Olive Garden","Red Robin","Outback Steakhouse",
];

const SAMPLE_RECIPES = [
  { id: 1, name: "Spaghetti Bolognese", recipeType: "Entrée", notes: "Great made a day ahead — the sauce improves overnight.", ingredients: [
    { name: "Ground beef", qty: "1", unit: "lb", category: "Meat & Seafood" },
    { name: "Spaghetti", qty: "12", unit: "oz", category: "Pantry & Dry Goods" },
    { name: "Tomato sauce", qty: "24", unit: "oz", category: "Canned & Jarred" },
    { name: "Onion", qty: "1", unit: "whole", category: "Produce" },
    { name: "Garlic", qty: "4", unit: "clove", category: "Produce" },
    { name: "Parmesan cheese", qty: "1/2", unit: "cup", category: "Dairy & Eggs" },
  ], steps: [
    "Dice the onion and mince the garlic.",
    "Heat olive oil in a large skillet over medium-high heat. Add onion and cook until softened, about 5 minutes.",
    "Add garlic and cook 1 minute until fragrant.",
    "Add ground beef and cook, breaking it up, until browned all the way through. Drain excess fat.",
    "Pour in the tomato sauce, stir to combine. Season with salt, pepper, and Italian seasoning. Simmer on low for 20 minutes.",
    "Meanwhile, cook spaghetti according to package directions. Reserve 1/2 cup pasta water before draining.",
    "Toss drained pasta with the sauce, adding pasta water as needed to loosen.",
    "Serve topped with freshly grated Parmesan cheese.",
  ]},
  { id: 2, name: "Chicken Stir Fry", recipeType: "Entrée", notes: "Swap chicken for shrimp or tofu. Add red pepper flakes for heat.", ingredients: [
    { name: "Chicken breast", qty: "1.5", unit: "lb", category: "Meat & Seafood" },
    { name: "Broccoli", qty: "2", unit: "cup", category: "Produce" },
    { name: "Bell peppers", qty: "2", unit: "whole", category: "Produce" },
    { name: "Soy sauce", qty: "3", unit: "tbsp", category: "Condiments & Sauces" },
    { name: "Rice", qty: "2", unit: "cup", category: "Pantry & Dry Goods" },
  ], steps: [
    "Cook rice according to package directions and keep warm.",
    "Slice chicken breast into thin strips. Season lightly with salt and pepper.",
    "Heat a wok or large skillet over high heat with 1 tbsp oil.",
    "Add chicken and stir-fry 5–6 minutes until cooked through. Remove and set aside.",
    "Add another splash of oil to the pan. Add broccoli and sliced bell peppers. Stir-fry 3–4 minutes until tender-crisp.",
    "Return chicken to the pan. Pour in soy sauce and toss everything together for 1–2 minutes.",
    "Serve immediately over steamed rice.",
  ]},
  { id: 3, name: "Avocado Toast", recipeType: "Entrée", notes: "Top with everything bagel seasoning or a drizzle of hot honey.", ingredients: [
    { name: "Sourdough bread", qty: "4", unit: "slice", category: "Bakery & Bread" },
    { name: "Avocados", qty: "2", unit: "whole", category: "Produce" },
    { name: "Eggs", qty: "4", unit: "whole", category: "Dairy & Eggs" },
    { name: "Lemon", qty: "1", unit: "whole", category: "Produce" },
  ], steps: [
    "Toast sourdough slices to your preferred level of crispness.",
    "Halve and pit avocados. Scoop flesh into a bowl.",
    "Add a squeeze of lemon juice, salt, and pepper. Mash to desired texture.",
    "Fry or poach eggs to your liking — runny yolks work best here.",
    "Spread mashed avocado generously on each toast slice.",
    "Top each slice with a fried or poached egg.",
    "Finish with flaky salt, cracked pepper, and any desired toppings.",
  ]},
  { id: 4, name: "Caesar Salad", recipeType: "Side", notes: "Add grilled chicken to make it a full meal.", ingredients: [
    { name: "Romaine lettuce", qty: "2", unit: "head", category: "Produce" },
    { name: "Caesar dressing", qty: "1/2", unit: "cup", category: "Condiments & Sauces" },
    { name: "Croutons", qty: "1", unit: "cup", category: "Bakery & Bread" },
    { name: "Parmesan cheese", qty: "1/2", unit: "cup", category: "Dairy & Eggs" },
  ], steps: [
    "Wash and dry romaine leaves. Chop into bite-sized pieces.",
    "Place lettuce in a large bowl. Drizzle with Caesar dressing and toss to coat evenly.",
    "Add croutons and toss gently so they stay crisp.",
    "Shave or grate Parmesan over the top.",
    "Serve immediately for best texture.",
  ]},
];

let nextId = 200;
const uid = () => ++nextId;

const emptySlot = () => ({ entree: "", side: "", side2: "", extras: [], restaurant: "" });

const buildShoppingList = (mealPlan, recipes, existing = []) => {
  const map = {};
  const addIngredients = (recipeId) => {
    if (!recipeId) return;
    const recipe = recipes.find(r => r.id === parseInt(recipeId));
    if (!recipe) return;
    recipe.ingredients.forEach(ing => {
      if (!ing.name || !ing.name.trim()) return; // skip nameless entries
      const k = ing.name.toLowerCase();
      if (map[k]) {
        // Try to sum numeric quantities; gracefully handle blank/missing
        const existingQty = parseFloat(map[k].qty);
        const newQty = parseFloat(ing.qty);
        if (!isNaN(existingQty) && !isNaN(newQty)) {
          map[k].qty = String(existingQty + newQty);
        } else if (map[k].qty && ing.qty) {
          map[k].qty = `${map[k].qty} + ${ing.qty}`;
        } else if (!map[k].qty && ing.qty) {
          map[k].qty = ing.qty;
        }
        // fill in unit/category from the new entry if the existing one is blank
        if (!map[k].unit && ing.unit) map[k].unit = ing.unit;
        if (!map[k].category && ing.category) map[k].category = ing.category;
        map[k].count += 1;
      } else {
        map[k] = { ...ing, id: uid(), count: 1, checkedAt: null };
      }
    });
  };
  Object.values(mealPlan).forEach(slot => {
    if (!slot || slot.entree === DINE_OUT_ID) return;
    addIngredients(slot.entree);
    addIngredients(slot.side);
    addIngredients(slot.side2);
    (slot.extras || []).forEach(ex => {
      if (!ex) return;
      const id = typeof ex === "string" ? ex : (ex.type === "recipe" ? ex.value : null);
      if (id) addIngredients(id);
    });
  });
  // Merge with existing to preserve checkedAt timestamps and manual items
  return Object.values(map).map(item => {
    const prev = existing.find(e => e.name.toLowerCase() === item.name.toLowerCase());
    return prev ? { ...item, id: prev.id, checkedAt: prev.checkedAt } : item;
  });
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Cinzel:wght@400;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#0e0c09;}
  .app{font-family:'Cormorant Garamond',Georgia,serif;min-height:100vh;background:#0e0c09;color:#e8dfc8;overflow-x:hidden;}
  .app::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 60% 40% at 50% 0%,rgba(180,140,60,0.08) 0%,transparent 70%);pointer-events:none;z-index:0;}

  /* HEADER */
  .header{position:relative;z-index:10;text-align:center;padding:36px 24px 24px;border-bottom:1px solid rgba(180,150,60,0.2);background:linear-gradient(180deg,rgba(18,14,9,0.99) 0%,rgba(14,12,9,0.96) 100%);}
  .logo{font-family:'Cinzel',serif;font-size:clamp(24px,4vw,44px);font-weight:700;color:#d4a843;letter-spacing:5px;text-shadow:0 0 30px rgba(212,168,67,0.2);}
  .logo-sub{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:#8a7a50;letter-spacing:3px;margin-top:5px;}
  .divider{display:flex;align-items:center;gap:14px;margin:14px auto;max-width:260px;}
  .divider-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(180,150,60,0.5),transparent);}
  .nav{display:flex;justify-content:center;gap:0;margin-top:18px;}
  .nav-btn{font-family:'Cinzel',serif;font-size:9px;letter-spacing:2.5px;padding:9px 24px;border:1px solid transparent;background:transparent;color:#a09060;cursor:pointer;transition:all 0.25s;text-transform:uppercase;}
  .nav-btn:hover{color:#e0b84a;}
  .nav-btn.active{border-color:rgba(180,150,60,0.5);color:#f5d060;background:rgba(180,150,60,0.1);}
  .badge{display:inline-block;background:#b8963c;color:#0e0c09;border-radius:50%;width:16px;height:16px;font-size:8px;line-height:16px;text-align:center;margin-left:5px;}

  .main{max-width:1100px;margin:0 auto;padding:40px 20px;position:relative;z-index:1;}

  /* EDIT BAR */
  .edit-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;padding:14px 20px;border:1px solid rgba(180,150,60,0.2);background:rgba(180,150,60,0.04);}
  .edit-bar-title{font-family:'Cinzel',serif;font-size:9px;letter-spacing:3px;color:#d4a843;text-transform:uppercase;}
  .edit-bar-note{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:#a09060;margin-top:2px;}
  .edit-mode-strip{background:rgba(180,150,60,0.08);border:1px solid rgba(180,150,60,0.3);}

  /* BUTTONS */
  .btn-gold{font-family:'Cinzel',serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;padding:10px 24px;background:transparent;border:1px solid #b8963c;color:#e0b848;cursor:pointer;transition:all 0.25s;}
  .btn-gold:hover{background:rgba(180,150,60,0.15);box-shadow:0 0 16px rgba(180,150,60,0.15);}
  .btn-ghost{font-family:'Cinzel',serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;padding:9px 18px;background:transparent;border:1px solid rgba(180,150,60,0.3);color:#b09050;cursor:pointer;transition:all 0.25s;}
  .btn-ghost:hover{border-color:#b8963c;color:#e0b848;}
  .btn-danger{font-family:'Cinzel',serif;font-size:9px;letter-spacing:1px;padding:8px 14px;background:transparent;border:1px solid rgba(180,60,60,0.35);color:#c06060;cursor:pointer;transition:all 0.2s;}
  .btn-danger:hover{border-color:rgba(180,60,60,0.65);color:#e08080;}
  .btn-save{font-family:'Cinzel',serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;padding:10px 28px;background:rgba(180,150,60,0.15);border:1px solid #b8963c;color:#f0c848;cursor:pointer;transition:all 0.25s;}
  .btn-save:hover{background:rgba(180,150,60,0.25);}

  /* MENU VIEW */
  .menu-view{border:1px solid rgba(180,150,60,0.2);background:linear-gradient(160deg,#1a1510,#121009);}
  .menu-day{border-bottom:1px solid rgba(180,150,60,0.12);}
  .menu-day:last-child{border-bottom:none;}
  .menu-day-header{display:flex;align-items:center;gap:0;padding:0;}
  .menu-day-name{font-family:'Cinzel',serif;font-size:11px;letter-spacing:3px;color:#d4a843;text-transform:uppercase;width:120px;flex-shrink:0;padding:18px 20px;border-right:1px solid rgba(180,150,60,0.12);}
  .menu-meals{display:flex;flex:1;flex-wrap:wrap;}
  .menu-meal{flex:1;min-width:200px;padding:16px 20px;border-right:1px solid rgba(180,150,60,0.08);}
  .menu-meal:last-child{border-right:none;}
  .menu-meal-title{font-family:'Cinzel',serif;font-size:8px;letter-spacing:2px;color:#b09060;text-transform:uppercase;margin-bottom:10px;}
  .menu-entry{margin-bottom:4px;}
  .menu-entry-course{font-family:'Cinzel',serif;font-size:7px;letter-spacing:1.5px;color:#907848;text-transform:uppercase;margin-bottom:1px;}
  .menu-entry-name{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:15px;color:#e0d0a8;line-height:1.2;}
  .menu-entry-name.dine{color:#d4a843;}
  .menu-empty{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:#5a5038;}

  /* EDIT GRID */
  .edit-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:rgba(180,150,60,0.1);border:1px solid rgba(180,150,60,0.15);}
  .edit-col{background:#0e0c09;}
  .edit-col-hdr{font-family:'Cinzel',serif;font-size:8px;letter-spacing:2px;color:#d4a843;text-align:center;padding:12px 6px 8px;border-bottom:1px solid rgba(180,150,60,0.12);text-transform:uppercase;}
  .edit-slot{padding:8px 6px;border-bottom:1px solid rgba(180,150,60,0.07);}
  .edit-slot:last-child{border-bottom:none;}
  .edit-slot-lbl{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:9px;color:#a09060;margin-bottom:4px;text-align:center;}
  .course-lbl{font-family:'Cinzel',serif;font-size:7px;letter-spacing:1.5px;color:#907848;text-transform:uppercase;margin-top:5px;margin-bottom:2px;}
  .msel{width:100%;background:#1e1a12;border:1px solid rgba(180,150,60,0.2);color:#e8dfc8;font-family:'Cormorant Garamond',serif;font-size:10px;padding:4px 3px;cursor:pointer;outline:none;appearance:none;text-align:center;}
  .msel option{background:#1e1a12;color:#e8dfc8;}
  .msel:focus{border-color:rgba(180,150,60,0.5);}
  .rest-sel{border-color:rgba(180,150,60,0.3);background:#221d10;color:#d4a843;}
  .rest-sel option{background:#221d10;color:#d4a843;}
  .extra-row{display:flex;align-items:center;gap:2px;margin-top:3px;}
  .add-extra{font-family:'Cinzel',serif;font-size:7px;letter-spacing:1px;color:#907848;background:transparent;border:1px dashed rgba(180,150,60,0.2);padding:2px 4px;cursor:pointer;width:100%;margin-top:3px;transition:all 0.2s;text-align:center;}
  .add-extra:hover{border-color:rgba(180,150,60,0.45);color:#d4a843;}
  .rmv-btn{background:transparent;border:none;color:#904040;cursor:pointer;font-size:9px;padding:0 2px;flex-shrink:0;line-height:1;}
  .rmv-btn:hover{color:#e06060;}

  /* SHOPPING LIST */
  .shop-list{border:1px solid rgba(180,150,60,0.18);background:linear-gradient(160deg,#121009,#0d0b07);}
  .cathdr{font-family:'Cinzel',serif;font-size:8px;letter-spacing:4px;color:#d4a843;text-transform:uppercase;padding:18px 16px 7px;border-top:1px solid rgba(180,150,60,0.1);}
  .cathdr:first-child{border-top:none;}
  .sitem{display:flex;align-items:center;gap:8px;padding:12px 10px;border-bottom:1px solid rgba(180,150,60,0.08);transition:all 0.2s;cursor:grab;flex-wrap:nowrap;overflow:hidden;}
  .sitem:hover{background:rgba(180,150,60,0.03);}
  .sitem.dov{background:rgba(180,150,60,0.07);}
  .sitem.chk{opacity:0.4;}
  .cbox{width:26px;height:26px;border:1px solid rgba(180,150,60,0.4);background:transparent;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all 0.2s;}
  .cbox.on{background:rgba(180,150,60,0.2);border-color:#b8963c;}
  .iname{flex:1;font-family:'Cormorant Garamond',serif;font-size:16px;color:#e8dfc8;cursor:text;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .iname.cross{text-decoration:line-through;color:#5a5038;}
  .imeta{display:flex;align-items:center;gap:4px;flex-shrink:0;}
  .iqty{font-size:13px;color:#b09060;font-style:italic;cursor:text;min-width:28px;text-align:right;}
  .iunit{font-size:11px;color:#907848;font-style:italic;}
  .dh{color:rgba(180,150,60,0.35);font-size:14px;cursor:grab;user-select:none;flex-shrink:0;}

  /* INPUTS */
  .ginput{width:100%;background:transparent;border:none;border-bottom:1px solid rgba(180,150,60,0.2);color:#e8dfc8;font-family:'Cormorant Garamond',serif;font-size:14px;padding:8px 3px;outline:none;transition:border-color 0.2s;}
  .ginput:focus{border-bottom-color:#b8963c;}
  .ginput::placeholder{color:#5a5038;font-style:italic;}
  .gsel{background:#1e1a12;border:1px solid rgba(180,150,60,0.2);color:#e8dfc8;font-family:'Cormorant Garamond',serif;font-size:12px;padding:7px 9px;outline:none;cursor:pointer;width:100%;}
  .gsel option{background:#1e1a12;color:#e8dfc8;}
  .fgrid{display:grid;grid-template-columns:2fr 1fr 1.5fr auto;gap:10px;align-items:end;}
  .flbl{font-family:'Cinzel',serif;font-size:8px;letter-spacing:2px;color:#b09060;text-transform:uppercase;margin-bottom:5px;}

  /* RECIPE CARDS */
  .rgrid{display:grid;grid-template-columns:1fr;gap:16px;}
  .rcard{background:linear-gradient(135deg,#191410,#101008);border:1px solid rgba(180,150,60,0.18);padding:18px;transition:border-color 0.25s;}
  .rcard:hover{border-color:rgba(180,150,60,0.4);}
  .rname{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:18px;font-weight:300;color:#f0e4c0;margin-bottom:6px;}
  .rcount{font-size:9px;color:#907848;letter-spacing:1.5px;font-family:'Cinzel',serif;}
  .itag{display:inline-block;padding:2px 7px;border:1px solid rgba(180,150,60,0.18);font-size:10px;color:#a08858;margin-right:3px;margin-bottom:3px;font-style:italic;}
  .type-badge{font-family:'Cinzel',serif;font-size:7px;letter-spacing:1.5px;padding:2px 7px;text-transform:uppercase;}

  /* IMPORT PANELS */
  .ibox{background:rgba(180,150,60,0.03);border:1px solid rgba(180,150,60,0.14);}

  /* MISC */
  .empty{text-align:center;padding:60px 0;}
  .etxt{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:20px;color:#907848;}
  .esub{font-size:11px;color:#706040;letter-spacing:1px;margin-top:6px;}
  .rest-tag{display:inline-block;padding:2px 8px;border:1px solid rgba(180,150,60,0.25);font-size:10px;color:#b09060;margin-right:4px;margin-bottom:4px;font-style:italic;cursor:pointer;}
  .rest-tag:hover{border-color:rgba(180,60,60,0.5);color:#e08080;}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  .review-panel{border:1px solid rgba(180,150,60,0.35);background:linear-gradient(160deg,#1e1810,#141009);padding:24px;margin-bottom:20px;position:relative;}
  .review-panel::before{content:'';position:absolute;inset:10px;border:1px solid rgba(180,150,60,0.07);pointer-events:none;}
  .review-badge{display:inline-flex;align-items:center;gap:6px;font-family:'Cinzel',serif;font-size:8px;letter-spacing:2px;color:#d4a843;text-transform:uppercase;margin-bottom:16px;}
  .review-badge-dot{width:6px;height:6px;background:#b8963c;border-radius:50%;animation:pulse 1.5s ease-in-out infinite;}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
  .notes-area{width:100%;background:rgba(180,150,60,0.03);border:none;border-bottom:1px solid rgba(180,150,60,0.2);color:#d4c898;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;padding:8px 3px;outline:none;resize:vertical;min-height:64px;transition:border-color 0.2s;line-height:1.5;}
  .notes-area:focus{border-bottom-color:#b8963c;}
  .notes-area::placeholder{color:#5a5038;font-style:italic;}
  .recipe-notes{margin-top:10px;padding:10px 12px;background:rgba(180,150,60,0.04);border-left:2px solid rgba(180,150,60,0.3);}
  .recipe-notes-lbl{font-family:'Cinzel',serif;font-size:7px;letter-spacing:2px;color:#b09060;text-transform:uppercase;margin-bottom:4px;}
  .recipe-notes-text{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:#c0a870;line-height:1.5;white-space:pre-wrap;}
  .rcard-header{display:flex;justify-content:space-between;align-items:flex-start;cursor:pointer;user-select:none;}
  .rcard-toggle{font-size:10px;color:#b09060;flex-shrink:0;margin-left:8px;transition:transform 0.25s;}
  .rcard-toggle.open{transform:rotate(180deg);}
  .rcard-body{overflow:hidden;transition:max-height 0.35s ease;}
  .step-row{display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;}
  .step-num{font-family:'Cinzel',serif;font-size:9px;color:#d4a843;min-width:18px;margin-top:10px;flex-shrink:0;}
  .step-input{flex:1;background:transparent;border:none;border-bottom:1px solid rgba(180,150,60,0.18);color:#d4c898;font-family:'Cormorant Garamond',serif;font-size:13px;padding:7px 3px;outline:none;resize:none;min-height:38px;line-height:1.5;width:100%;}
  .step-input:focus{border-bottom-color:#b8963c;}
  .step-input::placeholder{color:#5a5038;font-style:italic;}
  .step-display{font-family:'Cormorant Garamond',serif;font-size:14px;color:#d4c898;line-height:1.6;padding:2px 0;}
  .print-check{width:14px;height:14px;border:1px solid rgba(180,150,60,0.4);background:transparent;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all 0.2s;margin-top:3px;}
  .print-check.on{background:rgba(180,150,60,0.2);border-color:#b8963c;}

  .stitle{font-family:'Cinzel',serif;font-size:9px;letter-spacing:4px;color:#d4a843;text-transform:uppercase;text-align:center;margin-bottom:5px;}
  .shead{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:32px;font-weight:300;text-align:center;color:#f0e4c0;margin-bottom:3px;}
  .ssub{text-align:center;font-size:11px;color:#907848;letter-spacing:1px;margin-bottom:32px;font-style:italic;}
  .menu-week-toggle{display:flex;justify-content:center;gap:0;margin-bottom:24px;}
  .week-tab{font-family:'Cinzel',serif;font-size:8px;letter-spacing:2.5px;text-transform:uppercase;padding:9px 28px;border:1px solid rgba(180,150,60,0.25);background:transparent;color:#a09060;cursor:pointer;transition:all 0.2s;}
  .week-tab:first-child{border-right:none;}
  .week-tab.active{background:rgba(180,150,60,0.12);color:#f5d060;border-color:rgba(180,150,60,0.5);}
  .week-tab:hover:not(.active){color:#e0b848;border-color:rgba(180,150,60,0.4);}
  .recipe-filter-bar{display:flex;align-items:center;gap:10px;margin-bottom:18px;padding:10px 16px;border:1px solid rgba(180,150,60,0.18);background:rgba(180,150,60,0.04);flex-wrap:wrap;}
  .filter-btn{font-family:'Cinzel',serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;padding:6px 16px;border:1px solid rgba(180,150,60,0.25);background:transparent;color:#a09060;cursor:pointer;transition:all 0.2s;}
  .filter-btn.active{background:rgba(180,150,60,0.14);color:#f5d060;border-color:rgba(180,150,60,0.55);}
  .filter-btn:hover:not(.active){color:#e0b848;border-color:rgba(180,150,60,0.45);}
  .filter-lbl{font-family:'Cinzel',serif;font-size:8px;letter-spacing:2px;color:#907848;text-transform:uppercase;margin-right:4px;}

  /* STAPLES MODAL */
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:100;display:flex;align-items:flex-start;justify-content:center;padding:20px 12px;overflow-y:auto;}
  .modal-box{background:#141009;border:1px solid rgba(180,150,60,0.4);padding:24px 20px;width:100%;max-width:480px;position:relative;}

  /* MOBILE */
  @media(max-width:600px){
    .main{padding:16px 10px;}
    .nav-btn{font-size:8px;letter-spacing:1.5px;padding:8px 14px;}
    .edit-bar{flex-direction:column;gap:10px;padding:12px;}
    .edit-grid{grid-template-columns:1fr 1fr;overflow-x:auto;}
    .menu-day-header{flex-direction:column;}
    .menu-day-name{width:100%;border-right:none;border-bottom:1px solid rgba(180,150,60,0.12);padding:10px 14px;}
    .menu-meals{flex-direction:column;}
    .menu-meal{min-width:unset;border-right:none;border-bottom:1px solid rgba(180,150,60,0.06);}
    .sitem{padding:10px 8px;gap:6px;}
    .iname{font-size:15px;}
    .fgrid{grid-template-columns:1fr 1fr;}
    .logo{font-size:22px;letter-spacing:3px;}
    .shead{font-size:22px;}
    .btn-gold,.btn-ghost,.btn-save{font-size:8px;padding:8px 14px;}
  }
`;

// Proper collapsible recipe card using ref-measured height
function RecipeCard({ recipe, isOpen, onToggle, printSelected, onPrintToggle, onEdit, onDelete, UNITS, STORE_CATEGORIES }) {
  const bodyRef = useRef(null);
  const type = recipe.recipeType || "Entrée";

  return (
    <div className="rcard">
      <div className="rcard-header" onClick={onToggle}>
        <div style={{ flex: 1 }}>
          <div className="rname" style={{ marginBottom: 4 }}>{recipe.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span className="type-badge" style={{ color: type === "Entrée" ? "#d4a843" : "#6aaa5a", border: `1px solid ${type === "Entrée" ? "rgba(180,150,60,0.3)" : "rgba(100,160,90,0.3)"}` }}>{type}</span>
            <span className="rcount">{recipe.ingredients.length} ingredients · {(recipe.steps || []).filter(s => s.trim()).length} steps</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }} onClick={e => e.stopPropagation()}>
          <div className={`print-check ${printSelected ? "on" : ""}`} title="Select for print" onClick={onPrintToggle}>
            {printSelected && <span style={{ color: "#b8963c", fontSize: 9 }}>✓</span>}
          </div>
          <button className="btn-ghost" style={{ padding: "3px 10px", fontSize: 9 }} onClick={onEdit}>Edit</button>
          {onDelete && <button className="btn-danger" style={{ padding: "3px 8px", fontSize: 9 }} onClick={onDelete}>✕</button>}
          <span className={`rcard-toggle ${isOpen ? "open" : ""}`}>▼</span>
        </div>
      </div>

      {/* Collapse using scrollHeight so it truly shrinks */}
      <div
        ref={bodyRef}
        style={{
          overflow: "hidden",
          transition: "max-height 0.35s ease",
          maxHeight: isOpen ? (bodyRef.current ? bodyRef.current.scrollHeight : 2000) : 0,
        }}
      >
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(180,150,60,0.12)" }}>
          <div className="flbl" style={{ marginBottom: 8 }}>Ingredients</div>
          <div style={{ marginBottom: 14 }}>
            {recipe.ingredients.map((ing, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: "1px dotted rgba(180,150,60,0.1)", alignItems: "baseline" }}>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, color: "#b09a60", minWidth: 40 }}>{ing.qty}</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 12, color: "#9a8650", minWidth: 44 }}>{ing.unit && ing.unit !== "—" ? ing.unit : ""}</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, color: "#d4c898" }}>{ing.name}</span>
              </div>
            ))}
          </div>

          {(recipe.steps || []).filter(s => s.trim()).length > 0 && (<>
            <div className="flbl" style={{ marginBottom: 8 }}>Instructions</div>
            {recipe.steps.filter(s => s.trim()).map((step, i) => (
              <div key={i} className="step-row" style={{ marginBottom: 10 }}>
                <span className="step-num">{i + 1}.</span>
                <span className="step-display">{step}</span>
              </div>
            ))}
          </>)}

          {recipe.notes && (
            <div className="recipe-notes" style={{ marginTop: 12 }}>
              <div className="recipe-notes-lbl">Chef's Notes</div>
              <div className="recipe-notes-text">{recipe.notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Self-contained row for adding a new staple item inside the modal
function StaplesAddRow({ onAdd, UNITS }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), qty, unit, category: "" });
    setName(""); setQty(""); setUnit("");
  };
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input className="ginput" value={name} placeholder="Item name"
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleAdd()}
        style={{ flex: 1, fontSize: 14 }} />
      <input className="ginput" value={qty} placeholder="Qty"
        onChange={e => setQty(e.target.value)}
        style={{ width: 46, textAlign: "center", fontSize: 14 }} />
      <select className="gsel" value={unit}
        onChange={e => setUnit(e.target.value)}
        style={{ width: 68, fontSize: 12, padding: "6px 4px" }}>
        <option value="">—</option>
        {UNITS.filter(u => u !== "—").map(u => <option key={u}>{u}</option>)}
      </select>
      <button className="btn-gold" onClick={handleAdd}
        style={{ padding: "6px 14px", fontSize: 16, flexShrink: 0 }}>+</button>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("planner");
  const [editMode, setEditMode] = useState(false);
  const [recipes, setRecipes] = useState(SAMPLE_RECIPES);
  // All recipes start collapsed; new ones added later also collapse by default
  const [collapsedCards, setCollapsedCards] = useState(() =>
    SAMPLE_RECIPES.reduce((acc, r) => ({ ...acc, [r.id]: true }), {})
  );
  // When recipes load from Firebase, collapse any that aren't already tracked
  const prevRecipeIds = useRef(new Set(SAMPLE_RECIPES.map(r => r.id)));
  useEffect(() => {
    const newIds = recipes.filter(r => !prevRecipeIds.current.has(r.id)).map(r => r.id);
    if (newIds.length) {
      setCollapsedCards(p => {
        const patch = newIds.reduce((acc, id) => ({ ...acc, [id]: true }), {});
        return { ...p, ...patch };
      });
      newIds.forEach(id => prevRecipeIds.current.add(id));
    }
  }, [recipes]);
  const [printSelected, setPrintSelected] = useState({});
  const [restaurants, setRestaurants] = useState(SAMPLE_RESTAURANTS);
  const [newRestaurant, setNewRestaurant] = useState("");
  const [activeWeek, setActiveWeek] = useState("this");
  const [mealPlan, setMealPlan] = useState({});
  const [nextMealPlan, setNextMealPlan] = useState({});
  const [draftPlan, setDraftPlan] = useState({});
  const [recipeFilter, setRecipeFilter] = useState("all");
  const [shoppingList, setShoppingList] = useState([]);
  const [dragItem, setDragItem] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [newManualItem, setNewManualItem] = useState({ name: "", qty: "", unit: "", category: "" });
  const [staples, setStaples] = useState(STAPLES_LIST.map(s => ({ ...s, id: uid() })));
  const [showStaples, setShowStaples] = useState(false);
  const imageInputRef = useRef();
  const [imagePreview, setImagePreview] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [newRecipe, setNewRecipe] = useState({ name: "", recipeType: "Entrée", notes: "", prepSteps: [""], cookSteps: [""], ingredients: [{ name: "", qty: "", unit: "", category: "" }] });
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [pendingRecipe, setPendingRecipe] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [confirmDeleteRecipeId, setConfirmDeleteRecipeId] = useState(null);
  const [fbReady, setFbReady] = useState(false);

  // ── Firebase sync ─────────────────────────────────────────────────────────
  // Strategy: for each collection, attach an onSnapshot listener.
  // The FIRST snapshot (exists or not) marks that collection as "loaded".
  // We only allow writes AFTER all collections have fired their first snapshot.
  // This prevents the default state from overwriting saved Firestore data.

  const fbLoaded = useRef({});
  const COLLECTIONS = ["recipes", "mealPlan", "nextMealPlan", "shoppingList", "restaurants", "staples"];
  const skipWrite = useRef({ recipes: true, mealPlan: true, nextMealPlan: true, shoppingList: true, restaurants: true, staples: true });

  useEffect(() => {
    const unsubs = [];

    const markLoaded = (name) => {
      fbLoaded.current[name] = true;
      // Once all collections have fired their first snapshot, allow writes
      if (COLLECTIONS.every(c => fbLoaded.current[c])) {
        // Small delay so all setStates have settled before writes are allowed
        setTimeout(() => {
          COLLECTIONS.forEach(c => { skipWrite.current[c] = false; });
          setFbReady(true);
        }, 100);
      }
    };

    const listen = (name, docPath, onData) => {
      const ref = doc(db, ...docPath.split("/"));
      const unsub = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          onData(snap.data());
        }
        // Mark loaded regardless of whether doc exists
        if (!fbLoaded.current[name]) markLoaded(name);
      }, (err) => {
        console.error("Firestore listen error:", docPath, err);
        if (!fbLoaded.current[name]) markLoaded(name);
      });
      unsubs.push(unsub);
    };

    listen("recipes",       "household/recipes",       (d) => { if (Array.isArray(d.list)) setRecipes(d.list); });
    listen("mealPlan",      "household/mealPlan",      (d) => { if (d.plan)                setMealPlan(d.plan); });
    listen("nextMealPlan",  "household/nextMealPlan",  (d) => { if (d.plan)                setNextMealPlan(d.plan); });
    listen("shoppingList",  "household/shoppingList",  (d) => { if (Array.isArray(d.list)) setShoppingList(d.list); });
    listen("restaurants",   "household/restaurants",   (d) => { if (Array.isArray(d.list)) setRestaurants(d.list); });
    listen("staples",       "household/staples",       (d) => { if (Array.isArray(d.list)) setStaples(d.list); });

    // Safety fallback — if Firestore never responds (offline/blocked), unblock UI after 5s
    const fallback = setTimeout(() => {
      COLLECTIONS.forEach(c => { skipWrite.current[c] = false; });
      setFbReady(true);
    }, 5000);

    return () => { unsubs.forEach(u => u()); clearTimeout(fallback); };
  }, []);

  // ── Write helpers — only fire after initial load, skip on first render ────
  const saveToFb = useCallback((docPath, data) => {
    setDoc(doc(db, ...docPath.split("/")), data)
      .catch(err => console.error("Firestore write error:", docPath, err));
  }, []);

  useEffect(() => { if (!skipWrite.current.recipes)      saveToFb("household/recipes",      { list: recipes }); },      [recipes]);
  useEffect(() => { if (!skipWrite.current.mealPlan)     saveToFb("household/mealPlan",     { plan: mealPlan }); },     [mealPlan]);
  useEffect(() => { if (!skipWrite.current.nextMealPlan) saveToFb("household/nextMealPlan", { plan: nextMealPlan }); }, [nextMealPlan]);
  useEffect(() => { if (!skipWrite.current.shoppingList) saveToFb("household/shoppingList", { list: shoppingList }); }, [shoppingList]);
  useEffect(() => { if (!skipWrite.current.restaurants)  saveToFb("household/restaurants",  { list: restaurants }); },  [restaurants]);
  useEffect(() => { if (!skipWrite.current.staples)      saveToFb("household/staples",      { list: staples }); },      [staples]);

  // Auto-purge checked items after 24h
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setShoppingList(prev => prev.filter(i => !i.checkedAt || (now - i.checkedAt) < CHECK_TTL));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-add staples on Monday
  useEffect(() => {
    const lastStaplesKey = "lastStaplesAdded";
    const checkAndAddStaples = () => {
      const today = new Date();
      if (today.getDay() !== 1) return; // 1 = Monday
      const todayStr = today.toDateString();
      const last = localStorage.getItem(lastStaplesKey);
      if (last === todayStr) return;
      setShoppingList(prev => {
        const existing = [...prev];
        staples.forEach(staple => {
          const alreadyThere = existing.some(i => i.name.toLowerCase() === staple.name.toLowerCase());
          if (!alreadyThere) existing.push({ ...staple, id: uid(), checkedAt: null });
        });
        return existing;
      });
      localStorage.setItem(lastStaplesKey, todayStr);
    };
    checkAndAddStaples();
  }, [staples]);

  const getMealsForDay = (day) => WEEKEND_DAYS.includes(day) ? WEEKEND_MEALS : WEEKDAY_MEALS;

  // Draft helpers
  const getDraftSlot = (day, meal) => draftPlan[`${day}-${meal}`] || emptySlot();
  const updateDraftSlot = (day, meal, patch) =>
    setDraftPlan(prev => ({ ...prev, [`${day}-${meal}`]: { ...getDraftSlot(day, meal), ...patch } }));
  const addDraftExtra = (day, meal) =>
    setDraftPlan(prev => { const k=`${day}-${meal}`; const s=getDraftSlot(day,meal); return {...prev,[k]:{...s,extras:[...s.extras,{type:"recipe",value:""}]}}; });
  const updateDraftExtra = (day, meal, idx, patch) =>
    setDraftPlan(prev => { const k=`${day}-${meal}`; const s=getDraftSlot(day,meal); const e=[...s.extras]; e[idx]={...e[idx],...patch}; return {...prev,[k]:{...s,extras:e}}; });
  const removeDraftExtra = (day, meal, idx) =>
    setDraftPlan(prev => { const k=`${day}-${meal}`; const s=getDraftSlot(day,meal); return {...prev,[k]:{...s,extras:s.extras.filter((_,i)=>i!==idx)}}; });

  const currentMealPlan = activeWeek === "this" ? mealPlan : nextMealPlan;
  const setCurrentMealPlan = activeWeek === "this" ? setMealPlan : setNextMealPlan;

  const enterEdit = () => { setDraftPlan(JSON.parse(JSON.stringify(currentMealPlan))); setEditMode(true); };
  const cancelEdit = () => { setDraftPlan({}); setEditMode(false); };

  const saveEdit = () => {
    setCurrentMealPlan(draftPlan);
    // Only rebuild shopping list from this week's plan
    const planForShopping = activeWeek === "this" ? draftPlan : mealPlan;
    const newList = buildShoppingList(planForShopping, recipes, shoppingList);
    setShoppingList(newList);
    setDraftPlan({});
    setEditMode(false);
  };

  // Get display name for a slot field
  const recipeName = (id) => { if (!id) return null; if (id === DINE_OUT_ID) return null; const r = recipes.find(r => r.id === parseInt(id)); return r ? r.name : null; };

  // Shopping list
  const toggleCheck = (id) => {
    setShoppingList(prev => prev.map(item => {
      if (item.id !== id) return item;
      const now = Date.now();
      return { ...item, checkedAt: item.checkedAt ? null : now };
    }));
  };
  const updateItem = (id, field, value) => setShoppingList(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  const removeItem = (id) => setShoppingList(prev => prev.filter(i => i.id !== id));
  const addManualItem = () => {
    if (!newManualItem.name.trim()) return;
    setShoppingList(prev => [...prev, { ...newManualItem, id: uid(), checkedAt: null }]);
    setNewManualItem({ name: "", qty: "", unit: "", category: "" });
  };

  const printShoppingList = () => {
    const grouped = STORE_CATEGORIES.reduce((acc, cat) => {
      const items = shoppingList.filter(i => i.category === cat && !i.checkedAt);
      if (items.length) acc[cat] = items;
      return acc;
    }, {});
    const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const html = `<!DOCTYPE html><html><head><title>The Wilson's — Shopping List</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;1,400&family=Cinzel:wght@400;600&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Cormorant Garamond',Georgia,serif;color:#1a1510;background:#fdf9f4;padding:40px 48px;max-width:800px;margin:0 auto;}
      h1{font-family:'Cinzel',serif;font-size:28px;font-weight:600;letter-spacing:4px;color:#1a1510;text-align:center;margin-bottom:4px;}
      .sub{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:#7a6840;text-align:center;letter-spacing:2px;margin-bottom:6px;}
      .date{font-family:'Cinzel',serif;font-size:9px;letter-spacing:3px;color:#9a8060;text-align:center;text-transform:uppercase;margin-bottom:24px;}
      .divider{height:1px;background:linear-gradient(90deg,transparent,#c8a040,transparent);margin:0 auto 28px;max-width:300px;}
      .category{margin-bottom:22px;}
      .cat-name{font-family:'Cinzel',serif;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#b8963c;border-bottom:1px solid #e8d8b0;padding-bottom:5px;margin-bottom:10px;}
      .item{display:flex;align-items:baseline;gap:8px;padding:5px 0;border-bottom:1px dotted #e8e0d0;}
      .item:last-child{border-bottom:none;}
      .check{width:14px;height:14px;border:1px solid #c8a040;display:inline-block;flex-shrink:0;margin-top:2px;}
      .qty{font-size:14px;color:#5a4030;min-width:30px;text-align:right;flex-shrink:0;}
      .unit{font-size:13px;color:#7a6040;font-style:italic;min-width:40px;flex-shrink:0;}
      .name{font-size:16px;color:#1a1510;flex:1;}
      .footer{margin-top:32px;text-align:center;font-family:'Cinzel',serif;font-size:8px;letter-spacing:2px;color:#c8b890;text-transform:uppercase;}
      @media print{body{padding:20px 32px;}@page{margin:0.5in;size:letter portrait;}}
    </style></head><body>
      <h1>The Wilson's Kitchen</h1>
      <div class="date">${date}</div>
      <div class="divider"></div>
      ${Object.entries(grouped).map(([cat, items]) => `
        <div class="category">
          <div class="cat-name">${cat}</div>
          ${items.map(item => `
            <div class="item">
              <span class="check"></span>
              <span class="qty">${item.qty || ""}</span>
              <span class="unit">${item.unit && item.unit !== "—" ? item.unit : ""}</span>
              <span class="name">${item.name}</span>
            </div>
          `).join("")}
        </div>
      `).join("")}
      <div class="footer">The Wilson's &nbsp;&diams;&nbsp; Weekly Provisions</div>
    </body></html>`;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 600);
  };

  const printRecipes = () => {
    const selected = recipes.filter(r => printSelected[r.id]);
    if (!selected.length) return;
    const html = `<!DOCTYPE html><html><head><title>The Wilson's Kitchen — Recipes</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Cinzel:wght@400;600&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Cormorant Garamond',Georgia,serif;color:#1a1510;background:#fdf9f4;padding:40px 48px;max-width:760px;margin:0 auto;}
      .site-hdr{text-align:center;margin-bottom:32px;padding-bottom:20px;border-bottom:1px solid #d8c89a;}
      h1{font-family:'Cinzel',serif;font-size:26px;font-weight:600;letter-spacing:4px;color:#1a1510;margin-bottom:3px;}
      .sub{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:12px;color:#7a6840;letter-spacing:2px;}
      .recipe{margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid #e8d8b0;page-break-inside:avoid;}
      .recipe:last-child{border-bottom:none;}
      .recipe-name{font-family:'Cinzel',serif;font-size:20px;font-weight:600;letter-spacing:2px;color:#1a1510;margin-bottom:3px;}
      .recipe-type{font-family:'Cinzel',serif;font-size:8px;letter-spacing:2px;color:#b8963c;text-transform:uppercase;margin-bottom:14px;}
      .section-lbl{font-family:'Cinzel',serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#b8963c;border-bottom:1px solid #e8d8b0;padding-bottom:4px;margin-bottom:10px;margin-top:18px;}
      .ing-table{width:100%;border-collapse:collapse;margin-bottom:4px;}
      .ing-table td{padding:4px 8px 4px 0;font-size:14px;vertical-align:top;border-bottom:1px dotted #e8e0d0;}
      .ing-table td:first-child{color:#5a4030;white-space:nowrap;width:80px;}
      .ing-table td:nth-child(2){color:#7a6040;font-style:italic;white-space:nowrap;width:60px;}
      .step{display:flex;gap:12px;margin-bottom:10px;align-items:flex-start;}
      .step-n{font-family:'Cinzel',serif;font-size:10px;color:#b8963c;min-width:20px;flex-shrink:0;padding-top:1px;}
      .step-t{font-size:15px;color:#1a1510;line-height:1.6;flex:1;}
      .notes-block{margin-top:14px;padding:10px 14px;background:#f5ede0;border-left:3px solid #c8a040;}
      .notes-lbl{font-family:'Cinzel',serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#b8963c;margin-bottom:4px;}
      .notes-txt{font-style:italic;font-size:13px;color:#5a4030;line-height:1.5;white-space:pre-wrap;}
      @media print{body{padding:20px 32px;}@page{margin:0.5in;size:letter portrait;}.recipe{page-break-inside:avoid;}}
    </style></head><body>
      <div class="site-hdr"><h1>The Wilson's Kitchen</h1></div>
      ${selected.map(r => `
        <div class="recipe">
          <div class="recipe-name">${r.name}</div>
          <div class="recipe-type">${r.recipeType || "Entrée"}</div>
          <div class="section-lbl">Ingredients</div>
          <table class="ing-table">
            ${(r.ingredients || []).map(ing => `<tr><td>${ing.qty || ""}${ing.unit && ing.unit !== "—" ? " " + ing.unit : ""}</td><td></td><td>${ing.name}</td></tr>`).join("")}
          </table>
          ${(r.steps || []).filter(s => s.trim()).length ? `
            <div class="section-lbl">Instructions</div>
            ${r.steps.filter(s => s.trim()).map((s, i) => `<div class="step"><span class="step-n">${i + 1}.</span><span class="step-t">${s}</span></div>`).join("")}
          ` : ""}
          ${r.notes ? `<div class="notes-block"><div class="notes-lbl">Chef's Notes</div><div class="notes-txt">${r.notes}</div></div>` : ""}
        </div>
      `).join("")}
    </body></html>`;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  // Steps helpers — field can be "steps", "prepSteps", or "cookSteps"
  const updateStep = (setter, field, idx, val) =>
    setter(prev => { const arr = [...(prev[field] || [])]; arr[idx] = val; return { ...prev, [field]: arr }; });
  const addStep = (setter, field) =>
    setter(prev => ({ ...prev, [field]: [...(prev[field] || []), ""] }));
  const removeStep = (setter, field, idx) =>
    setter(prev => ({ ...prev, [field]: (prev[field] || []).filter((_, i) => i !== idx) }));

  // Drag & drop shopping list
  const handleDragStart = (e, id) => { setDragItem(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e, id) => { e.preventDefault(); setDragOver(id); };
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (dragItem === targetId) return;
    setShoppingList(prev => {
      const list = [...prev];
      const from = list.findIndex(i => i.id === dragItem);
      const to = list.findIndex(i => i.id === targetId);
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      return list;
    });
    setDragItem(null); setDragOver(null);
  };
  const handleDragEnd = () => { setDragItem(null); setDragOver(null); };

  // AI file upload — handles images and PDFs
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageError(""); setImageLoading(true);

    const isPdf = file.type === "application/pdf";
    if (!isPdf) setImagePreview(URL.createObjectURL(file));

    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = () => rej(new Error("Read failed"));
        reader.readAsDataURL(file);
      });

      const prompt = `Extract the recipe from this ${isPdf ? "PDF" : "image"} and return ONLY valid JSON, no markdown fences, no explanation:
{"name":"Recipe Name","recipeType":"Entrée","notes":"any tips or serving suggestions","steps":["Step 1","Step 2"],"ingredients":[{"name":"ingredient","qty":"1","unit":"cup","category":"Produce"}]}
Rules:
- recipeType must be exactly "Entrée" or "Side"
- unit must be one of: ${UNITS.join(", ")}
- category must be one of: ${STORE_CATEGORIES.join(", ")}
- Include ALL steps in order
- qty as a string like "1", "1/2", "2.5"
Return ONLY the JSON object.`;

      // Build content blocks — PDFs use document type, images use image type
      const fileBlock = isPdf
        ? {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          }
        : {
            type: "image",
            source: { type: "base64", media_type: file.type || "image/jpeg", data: base64 },
          };

      const reqBody = {
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: [fileBlock, { type: "text", text: prompt }] }],
      };

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
      });

      const data = await response.json();

      // Surface API-level errors clearly
      if (!response.ok || data.error) {
        const msg = data?.error?.message || `API error ${response.status}`;
        console.error("API error:", data);
        setImageError(`API error: ${msg}`);
        return;
      }

      const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      if (!text) {
        console.error("Empty response:", data);
        setImageError("No response from AI. Check console for details.");
        return;
      }

      const match = text.replace(/```json|```/g, "").match(/\{[\s\S]*\}/);
      if (!match) {
        console.error("No JSON in response:", text);
        setImageError("Could not parse recipe from that file. Try a clearer image.");
        return;
      }

      const parsed = JSON.parse(match[0]);
      if (parsed.name && Array.isArray(parsed.ingredients)) {
        setPendingRecipe({ ...parsed, id: uid() });
        setImagePreview(null);
      } else {
        setImageError("Could not find a recipe in that file. Try a clearer photo or a different page.");
      }
    } catch (err) {
      console.error("File upload error:", err);
      setImageError(`Error: ${err.message}`);
    } finally {
      setImageLoading(false);
      e.target.value = "";
    }
  };

  // AI URL extract
  const handleUrlExtract = async () => {
    const url = urlInput.trim(); if (!url) return;
    setUrlError(""); setUrlLoading(true);
    try {
      // Step 1: fetch the page content via Claude's web_search tool in agentic mode
      // We use a two-turn approach: first turn asks Claude to fetch and extract,
      // using the URL as a document source in the message
      const prompt = `You are a recipe extraction assistant. The user wants to import a recipe from this URL: ${url}

Please extract the complete recipe and return ONLY a valid JSON object with no markdown fences, no explanation, nothing else — just the raw JSON:

{"name":"Recipe Name","recipeType":"Entrée","notes":"any tips or notes","steps":["Step 1","Step 2"],"ingredients":[{"name":"ingredient name","qty":"1","unit":"cup","category":"Produce"}]}

Rules:
- recipeType must be exactly "Entrée" or "Side"
- unit must be one of: ${UNITS.join(", ")}
- category must be one of: ${STORE_CATEGORIES.join(", ")}
- Include ALL steps in order (prep + cooking combined)
- qty should be a number or fraction as a string like "1", "1/2", "2.5"
- If you cannot access the URL, make your best guess based on the URL itself or return {"error":"cannot_fetch"}

Return ONLY the JSON, nothing else.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          tool_choice: { type: "auto" },
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();

      // Handle multi-turn if Claude used web_search tool
      let finalText = "";
      if (data.stop_reason === "tool_use") {
        // Claude wants to search — run the tool use loop
        const toolUseBlock = data.content.find(b => b.type === "tool_use");
        if (!toolUseBlock) throw new Error("No tool use block");

        // Make a second call with the tool result (we pass the URL as the search query result)
        const response2 = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4000,
            tools: [{ type: "web_search_20250305", name: "web_search" }],
            messages: [
              { role: "user", content: prompt },
              { role: "assistant", content: data.content },
              { role: "user", content: [{ type: "tool_result", tool_use_id: toolUseBlock.id, content: `Please extract the recipe from ${url} and return only JSON as instructed.` }] }
            ]
          })
        });
        const data2 = await response2.json();
        finalText = (data2.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      } else {
        finalText = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      }

      // Parse JSON from the response
      const cleaned = finalText.replace(/```json|```/g, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found in response");

      const parsed = JSON.parse(match[0]);
      if (parsed.error === "cannot_fetch") {
        setUrlError("Couldn't access that URL. Try copying the recipe text and using the manual entry form instead.");
        return;
      }
      if (!parsed.name || !Array.isArray(parsed.ingredients)) {
        setUrlError("No recipe found at that URL. Make sure it links directly to a recipe page.");
        return;
      }

      setPendingRecipe({ ...parsed, id: uid() });
      setUrlInput("");
    } catch (e) {
      console.error("URL extract error:", e);
      setUrlError("Could not extract recipe. Make sure the URL goes directly to a recipe page and try again.");
    } finally {
      setUrlLoading(false);
    }
  };

  const saveNewRecipe = () => {
    if (!newRecipe.name.trim()) return;
    // Combine prepSteps + cookSteps into steps for display/storage
    const steps = [
      ...(newRecipe.prepSteps || []).filter(s => s.trim()),
      ...(newRecipe.cookSteps || []).filter(s => s.trim()),
    ];
    // Route through pending review panel instead of saving directly
    setPendingRecipe({ ...newRecipe, steps, id: uid() });
    setNewRecipe({ name: "", recipeType: "Entrée", notes: "", prepSteps: [""], cookSteps: [""], ingredients: [{ name: "", qty: "", unit: "", category: "" }] });
    setShowAddRecipe(false);
  };
  const updateNewIngredient = (idx, field, value) =>
    setNewRecipe(prev => { const ings = [...prev.ingredients]; ings[idx] = { ...ings[idx], [field]: value }; return { ...prev, ingredients: ings }; });

  // Pending recipe helpers (for image/URL imports awaiting review)
  const updatePendingField = (field, value) => setPendingRecipe(prev => ({ ...prev, [field]: value }));
  const updatePendingIngredient = (idx, field, value) =>
    setPendingRecipe(prev => { const ings = [...prev.ingredients]; ings[idx] = { ...ings[idx], [field]: value }; return { ...prev, ingredients: ings }; });
  const addPendingIngredient = () =>
    setPendingRecipe(prev => ({ ...prev, ingredients: [...prev.ingredients, { name: "", qty: "", unit: "", category: "" }] }));
  const removePendingIngredient = (idx) =>
    setPendingRecipe(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== idx) }));
  const savePendingRecipe = () => {
    if (!pendingRecipe?.name?.trim()) return;
    setRecipes(prev => [...prev, pendingRecipe]);
    setCollapsedCards(p => ({ ...p, [pendingRecipe.id]: true }));
    setPendingRecipe(null);
  };

  // Existing recipe edit helpers
  const startEditRecipe = (recipe) => setEditingRecipe(JSON.parse(JSON.stringify(recipe)));
  const updateEditingField = (field, value) => setEditingRecipe(prev => ({ ...prev, [field]: value }));
  const updateEditingIngredient = (idx, field, value) =>
    setEditingRecipe(prev => { const ings = [...prev.ingredients]; ings[idx] = { ...ings[idx], [field]: value }; return { ...prev, ingredients: ings }; });
  const addEditingIngredient = () =>
    setEditingRecipe(prev => ({ ...prev, ingredients: [...prev.ingredients, { name: "", qty: "", unit: "", category: "" }] }));
  const removeEditingIngredient = (idx) =>
    setEditingRecipe(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== idx) }));
  const saveEditingRecipe = () => {
    if (!editingRecipe?.name?.trim()) return;
    setRecipes(prev => prev.map(r => r.id === editingRecipe.id ? editingRecipe : r));
    setEditingRecipe(null);
    setConfirmDeleteRecipeId(null);
  };

  const grouped = STORE_CATEGORIES.reduce((acc, cat) => {
    const items = shoppingList.filter(i => i.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  const remaining = shoppingList.filter(i => !i.checkedAt).length;

  // Collect all recipe IDs referenced in this week's meal plan
  const menuRecipeIds = new Set();
  Object.values(mealPlan).forEach(slot => {
    if (!slot || slot.entree === DINE_OUT_ID) return;
    if (slot.entree) menuRecipeIds.add(parseInt(slot.entree));
    if (slot.side) menuRecipeIds.add(parseInt(slot.side));
    if (slot.side2) menuRecipeIds.add(parseInt(slot.side2));
    (slot.extras || []).forEach(ex => {
      if (!ex) return;
      const id = typeof ex === "string" ? ex : (ex.type === "recipe" ? ex.value : null);
      if (id) menuRecipeIds.add(parseInt(id));
    });
  });

  // Render a read-only meal slot for the menu view
  const renderMenuSlot = (day, meal) => {
    const plan = editMode ? draftPlan : currentMealPlan;
    const slot = plan[`${day}-${meal}`] || emptySlot();
    const isDiner = slot.entree === DINE_OUT_ID;
    const entreeName = recipeName(slot.entree);
    const sideName = recipeName(slot.side);
    const side2Name = recipeName(slot.side2);
    // Support both legacy string extras (recipe IDs) and new object extras
    const extraItems = (slot.extras || []).map(ex => {
      if (!ex) return null;
      if (typeof ex === "string") {
        const n = recipeName(ex);
        return n ? { label: n, isText: false } : null;
      }
      if (ex.type === "text") return ex.value?.trim() ? { label: ex.value.trim(), isText: true } : null;
      const n = recipeName(ex.value);
      return n ? { label: n, isText: false } : null;
    }).filter(Boolean);
    const isDinner = meal === "Dinner";
    const hasContent = isDiner || entreeName || sideName || side2Name || extraItems.length;

    return (
      <div className="menu-meal" key={meal}>
        <div className="menu-meal-title">{meal}</div>
        {!hasContent ? <div className="menu-empty">—</div> : (
          <>
            {isDiner ? (
              <div className="menu-entry">
                <div className="menu-entry-name dine">🍽 {slot.restaurant || "Dining Out"}</div>
              </div>
            ) : (
              <>
                {entreeName && <div className="menu-entry">
                  <div className="menu-entry-course">Entrée</div>
                  <div className="menu-entry-name">{entreeName}</div>
                </div>}
                {isDinner && sideName && <div className="menu-entry" style={{ marginTop: 6 }}>
                  <div className="menu-entry-course">Side 1</div>
                  <div className="menu-entry-name">{sideName}</div>
                </div>}
                {isDinner && side2Name && <div className="menu-entry" style={{ marginTop: 6 }}>
                  <div className="menu-entry-course">Side 2</div>
                  <div className="menu-entry-name">{side2Name}</div>
                </div>}
                {extraItems.map((item, i) => <div key={i} className="menu-entry" style={{ marginTop: 6 }}>
                  <div className="menu-entry-course">{item.isText ? "Note" : "Extra"}</div>
                  <div className="menu-entry-name">{item.label}</div>
                </div>)}
              </>
            )}
          </>
        )}
      </div>
    );
  };

  // Render an editable meal slot
  const renderEditSlot = (day, meal) => {
    const slot = getDraftSlot(day, meal);
    const isDinner = meal === "Dinner";
    const dineOut = slot.entree === DINE_OUT_ID;
    const entrees = recipes.filter(r => r.recipeType === "Entrée" || !r.recipeType);
    const sides = recipes.filter(r => r.recipeType === "Side");
    return (
      <div className="edit-slot" key={meal}>
        <div className="edit-slot-lbl">{meal}</div>
        <div className="course-lbl">Entrée</div>
        <select className="msel" value={slot.entree}
          onChange={e => updateDraftSlot(day, meal, { entree: e.target.value, side: "", side2: "", extras: [], restaurant: "" })}>
          <option value="">—</option>
          <option value={DINE_OUT_ID}>🍽 Dine Out</option>
          {entrees.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {dineOut && (
          <select className="msel rest-sel" style={{ marginTop: 3 }} value={slot.restaurant}
            onChange={e => updateDraftSlot(day, meal, { restaurant: e.target.value })}>
            <option value="">— restaurant —</option>
            {restaurants.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
        {!dineOut && (<>
          {isDinner && (<>
            <div className="course-lbl">Side 1</div>
            <select className="msel" value={slot.side}
              onChange={e => updateDraftSlot(day, meal, { side: e.target.value })}>
              <option value="">—</option>
              {sides.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <div className="course-lbl">Side 2</div>
            <select className="msel" value={slot.side2}
              onChange={e => updateDraftSlot(day, meal, { side2: e.target.value })}>
              <option value="">—</option>
              {sides.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </>)}
          {(slot.extras || []).map((ex, idx) => {
            // Normalise legacy string extras to object form on first render
            const exObj = (typeof ex === "string") ? { type: "recipe", value: ex } : ex;
            const isText = exObj.type === "text";
            return (
              <div key={idx} className="extra-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 3 }}>
                {/* Type toggle + remove */}
                <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <button
                    style={{ fontFamily: "'Cinzel',serif", fontSize: 6, letterSpacing: 1, padding: "2px 5px", border: `1px solid ${isText ? "rgba(180,150,60,0.5)" : "rgba(180,150,60,0.2)"}`, background: isText ? "rgba(180,150,60,0.12)" : "transparent", color: isText ? "#d4a843" : "#907848", cursor: "pointer", transition: "all 0.15s", flexShrink: 0 }}
                    onClick={() => updateDraftExtra(day, meal, idx, { type: isText ? "recipe" : "text", value: "" })}
                    title="Toggle between recipe and free text"
                  >{isText ? "TEXT" : "RECIPE"}</button>
                  {isText ? (
                    <input
                      className="ginput"
                      placeholder="e.g. Garlic bread, leftovers…"
                      value={exObj.value || ""}
                      onChange={e => updateDraftExtra(day, meal, idx, { value: e.target.value })}
                      style={{ flex: 1, fontSize: 11, padding: "3px 4px" }}
                    />
                  ) : (
                    <select className="msel" style={{ flex: 1 }} value={exObj.value}
                      onChange={e => updateDraftExtra(day, meal, idx, { value: e.target.value })}>
                      <option value="">— recipe —</option>
                      {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  )}
                  <button className="rmv-btn" onClick={() => removeDraftExtra(day, meal, idx)}>✕</button>
                </div>
              </div>
            );
          })}
          <button className="add-extra" onClick={() => addDraftExtra(day, meal)}>+ add item</button>
        </>)}
      </div>
    );
  };

  // Show loading screen while Firebase syncs
  if (!fbReady) return (
    <div style={{ minHeight: "100vh", background: "#0e0c09", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <style>{css}</style>
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 28, fontWeight: 700, color: "#d4a843", letterSpacing: 5 }}>The Wilson's Kitchen</div>
      
      <div style={{ marginTop: 24, display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#b8963c", animation: "pulse 1.2s ease-in-out 0s infinite" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#b8963c", animation: "pulse 1.2s ease-in-out 0.2s infinite" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#b8963c", animation: "pulse 1.2s ease-in-out 0.4s infinite" }} />
      </div>
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 8, letterSpacing: 3, color: "#5a4e30", textTransform: "uppercase", marginTop: 4 }}>Loading your kitchen…</div>
    </div>
  );

  return (
    <div className="app">
      <style>{css}</style>

      <header className="header">
        <div className="logo">The Wilson's Kitchen</div>
        
        <div className="divider">
          <div className="divider-line" />
          <span style={{ color: "#b8963c", fontSize: 8 }}>◆</span>
          <div className="divider-line" />
        </div>
        <nav className="nav">
          {[["planner","Weekly Menu"],["recipes","Recipes"],["shopping","Shopping List"]].map(([key, label]) => (
            <button key={key} className={`nav-btn ${tab === key ? "active" : ""}`} onClick={() => { setTab(key); if(key !== "planner") { cancelEdit(); } }}>
              {label}
              {key === "shopping" && remaining > 0 && <span className="badge">{remaining}</span>}
            </button>
          ))}
        </nav>
      </header>

      <main className="main">

        {/* ── PLANNER ── */}
        {tab === "planner" && (
          <div>
            {/* Week toggle */}
            {!editMode && (
              <div className="menu-week-toggle">
                <button className={`week-tab ${activeWeek === "this" ? "active" : ""}`}
                  onClick={() => setActiveWeek("this")}>This Week</button>
                <button className={`week-tab ${activeWeek === "next" ? "active" : ""}`}
                  onClick={() => setActiveWeek("next")}>Next Week</button>
              </div>
            )}

            {/* Edit / Save bar */}
            <div className={`edit-bar ${editMode ? "edit-mode-strip" : ""}`}>
              <div>
                <div className="edit-bar-title">{editMode ? "✏ Edit Mode" : `◆ ${activeWeek === "this" ? "This Week's" : "Next Week's"} Menu`}</div>
                <div className="edit-bar-note">
                  {editMode ? "Make your selections, then save to update provisions." : "Click Edit Menu to plan your week."}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {editMode ? (
                  <>
                    <button className="btn-ghost" onClick={cancelEdit}>Cancel</button>
                    <button className="btn-save" onClick={saveEdit}>Save &amp; Update List</button>
                  </>
                ) : (
                  <button className="btn-gold" onClick={enterEdit}>Edit Menu</button>
                )}
              </div>
            </div>

            {/* READ-ONLY MENU VIEW */}
            {!editMode && (
              <div className="menu-view">
                {DAYS.map(day => {
                  const meals = getMealsForDay(day);
                  return (
                    <div key={day} className="menu-day">
                      <div className="menu-day-header">
                        <div className="menu-day-name">{day}</div>
                        <div className="menu-meals">
                          {meals.map(meal => renderMenuSlot(day, meal))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* EDIT GRID */}
            {editMode && (
              <>
                <div className="edit-grid">
                  {DAYS.map(day => {
                    const meals = getMealsForDay(day);
                    const isWeekend = WEEKEND_DAYS.includes(day);
                    return (
                      <div key={day} className="edit-col">
                        <div className="edit-col-hdr">
                          {day.slice(0,3)}
                          <div style={{ fontSize: 6, color: "#3a3020", letterSpacing: 0.5, marginTop: 2 }}>
                            {isWeekend ? "B·L·D" : "Dinner"}
                          </div>
                        </div>
                        {meals.map(meal => renderEditSlot(day, meal))}
                      </div>
                    );
                  })}
                </div>

                {/* Restaurant manager */}
                <div style={{ marginTop: 16, padding: "16px 20px", border: "1px solid rgba(180,150,60,0.12)", background: "rgba(180,150,60,0.02)" }}>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 8, letterSpacing: 3, color: "#5a4e30", textTransform: "uppercase", marginBottom: 10 }}>🍽 Favorite Restaurants</div>
                  <div style={{ marginBottom: 10 }}>
                    {restaurants.map(r => (
                      <span key={r} className="rest-tag" title="Click to remove" onClick={() => setRestaurants(p => p.filter(x => x !== r))}>
                        {r} &nbsp;✕
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="ginput" placeholder="Add a restaurant..." value={newRestaurant}
                      onChange={e => setNewRestaurant(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && newRestaurant.trim()) { setRestaurants(p => [...p, newRestaurant.trim()]); setNewRestaurant(""); }}} />
                    <button className="btn-ghost" onClick={() => { if (newRestaurant.trim()) { setRestaurants(p => [...p, newRestaurant.trim()]); setNewRestaurant(""); }}}>+ Add</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── RECIPES ── */}
        {tab === "recipes" && (
          <div>
            <div className="stitle">Culinary Collection</div>
            <div className="shead">Chef's Repertoire</div>
            <div className="ssub">{recipes.length} recipes saved</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>

              {/* Manual entry */}
              <div className="ibox" style={{ padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18, color: "#b8963c", opacity: 0.4 }}>✏</span>
                  <div>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 9, letterSpacing: 2, color: "#b09060", textTransform: "uppercase" }}>Enter Manually</div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 11, color: "#907848", marginTop: 2 }}>Type in the recipe name and ingredients yourself</div>
                  </div>
                </div>
                {!showAddRecipe ? (
                  <button className="btn-ghost" onClick={() => setShowAddRecipe(true)}>+ Begin New Recipe</button>
                ) : (
                  <div>
                    <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-end" }}>
                      <div style={{ flex: 1 }}>
                        <div className="flbl">Recipe Name</div>
                        <input className="ginput" style={{ fontSize: 16 }} placeholder="Name your dish..." value={newRecipe.name}
                          onChange={e => setNewRecipe(p => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div>
                        <div className="flbl">Type</div>
                        <select className="gsel" style={{ width: "auto" }} value={newRecipe.recipeType}
                          onChange={e => setNewRecipe(p => ({ ...p, recipeType: e.target.value }))}>
                          <option value="Entrée">Entrée</option>
                          <option value="Side">Side</option>
                        </select>
                      </div>
                    </div>
                    <div className="flbl" style={{ marginBottom: 8 }}>Ingredients</div>
                    {newRecipe.ingredients.map((ing, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 70px 110px 1.4fr auto", gap: 8, marginBottom: 8 }}>
                        <input className="ginput" placeholder="Ingredient" value={ing.name} onChange={e => updateNewIngredient(idx, "name", e.target.value)} />
                        <input className="ginput" placeholder="Qty" value={ing.qty} onChange={e => updateNewIngredient(idx, "qty", e.target.value)} />
                        <select className="gsel" value={ing.unit || "—"} onChange={e => updateNewIngredient(idx, "unit", e.target.value)}>
                          {UNITS.map(u => <option key={u}>{u}</option>)}
                        </select>
                        <select className="gsel" value={ing.category} onChange={e => updateNewIngredient(idx, "category", e.target.value)}>
                          {STORE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                        <button className="btn-danger" style={{ padding: "6px 10px" }} onClick={() => setNewRecipe(p => ({ ...p, ingredients: p.ingredients.filter((_, i) => i !== idx) }))}>✕</button>
                      </div>
                    ))}
                    <button className="btn-ghost" style={{ marginBottom: 20 }} onClick={() => setNewRecipe(p => ({ ...p, ingredients: [...p.ingredients, { name: "", qty: "", unit: "", category: "" }] }))}>+ Ingredient</button>

                    <div className="flbl" style={{ marginBottom: 8, marginTop: 4 }}>
                      Preparation Steps
                      <span style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontWeight: 300, letterSpacing: 0, textTransform: "none", fontSize: 11, color: "#3a3020", marginLeft: 8 }}>— washing, chopping, measuring</span>
                    </div>
                    {(newRecipe.prepSteps || [""]).map((step, idx) => (
                      <div key={idx} className="step-row">
                        <span className="step-num">{idx + 1}.</span>
                        <textarea className="step-input" placeholder={`Prep step ${idx + 1}... e.g. "Dice the onion and mince the garlic"`} value={step}
                          onChange={e => updateStep(setNewRecipe, "prepSteps", idx, e.target.value)} rows={2} />
                        <button className="rmv-btn" style={{ marginTop: 8 }} onClick={() => removeStep(setNewRecipe, "prepSteps", idx)}>✕</button>
                      </div>
                    ))}
                    <button className="btn-ghost" style={{ marginBottom: 20 }} onClick={() => addStep(setNewRecipe, "prepSteps")}>+ Prep Step</button>

                    <div className="flbl" style={{ marginBottom: 8 }}>
                      Cooking Steps
                      <span style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontWeight: 300, letterSpacing: 0, textTransform: "none", fontSize: 11, color: "#3a3020", marginLeft: 8 }}>— heat, timing, technique</span>
                    </div>
                    {(newRecipe.cookSteps || [""]).map((step, idx) => (
                      <div key={idx} className="step-row">
                        <span className="step-num">{idx + 1}.</span>
                        <textarea className="step-input" placeholder={`Cook step ${idx + 1}... e.g. "Sauté onion over medium heat for 5 minutes"`} value={step}
                          onChange={e => updateStep(setNewRecipe, "cookSteps", idx, e.target.value)} rows={2} />
                        <button className="rmv-btn" style={{ marginTop: 8 }} onClick={() => removeStep(setNewRecipe, "cookSteps", idx)}>✕</button>
                      </div>
                    ))}
                    <button className="btn-ghost" style={{ marginBottom: 16 }} onClick={() => addStep(setNewRecipe, "cookSteps")}>+ Cook Step</button>

                    <div style={{ marginTop: 8 }}>
                      <div className="flbl" style={{ marginBottom: 6 }}>Chef's Notes</div>
                      <textarea className="notes-area" placeholder="Tips, variations, family tweaks, serving suggestions..." value={newRecipe.notes || ""}
                        onChange={e => setNewRecipe(p => ({ ...p, notes: e.target.value }))} />
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                      <button className="btn-save" onClick={saveNewRecipe}>Review Recipe →</button>
                      <button className="btn-danger" onClick={() => setShowAddRecipe(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── PENDING RECIPE REVIEW PANEL ── */}
            {pendingRecipe && (
              <div className="review-panel">
                <div className="review-badge">
                  <span className="review-badge-dot" />
                  Review &amp; Edit Before Saving
                </div>
                <p style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 13, color: "#5a4e30", marginBottom: 20 }}>
                  We've extracted the recipe below — review it, make any corrections, then save it to your collection.
                </p>

                {/* Name + Type row */}
                <div style={{ display: "flex", gap: 14, marginBottom: 18, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <div className="flbl">Recipe Name</div>
                    <input className="ginput" style={{ fontSize: 18 }} value={pendingRecipe.name}
                      onChange={e => updatePendingField("name", e.target.value)} />
                  </div>
                  <div>
                    <div className="flbl">Type</div>
                    <select className="gsel" style={{ width: "auto" }} value={pendingRecipe.recipeType || "Entrée"}
                      onChange={e => updatePendingField("recipeType", e.target.value)}>
                      <option value="Entrée">Entrée</option>
                      <option value="Side">Side</option>
                    </select>
                  </div>
                </div>

                {/* Ingredients */}
                <div className="flbl" style={{ marginBottom: 10 }}>Ingredients</div>
                {pendingRecipe.ingredients.map((ing, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 70px 110px 1.4fr auto", gap: 8, marginBottom: 8 }}>
                    <input className="ginput" placeholder="Ingredient" value={ing.name}
                      onChange={e => updatePendingIngredient(idx, "name", e.target.value)} />
                    <input className="ginput" placeholder="Qty" value={ing.qty}
                      onChange={e => updatePendingIngredient(idx, "qty", e.target.value)} />
                    <select className="gsel" value={ing.unit || "—"} onChange={e => updatePendingIngredient(idx, "unit", e.target.value)}>
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                    <select className="gsel" value={ing.category}
                      onChange={e => updatePendingIngredient(idx, "category", e.target.value)}>
                      {STORE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <button className="btn-danger" style={{ padding: "6px 10px" }}
                      onClick={() => removePendingIngredient(idx)}>✕</button>
                  </div>
                ))}
                <button className="btn-ghost" style={{ marginBottom: 20 }} onClick={addPendingIngredient}>+ Add Ingredient</button>

                <div className="flbl" style={{ marginBottom: 8 }}>
                  Steps
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontWeight: 300, letterSpacing: 0, textTransform: "none", fontSize: 11, color: "#3a3020", marginLeft: 8 }}>— review and edit each step below</span>
                </div>
                {((pendingRecipe.steps || []).length === 0 ? [""] : pendingRecipe.steps).map((step, idx) => (
                  <div key={idx} className="step-row">
                    <span className="step-num">{idx + 1}.</span>
                    <textarea className="step-input" placeholder={`Step ${idx + 1}...`} value={step}
                      onChange={e => updateStep(setPendingRecipe, "steps", idx, e.target.value)} rows={2} />
                    <button className="rmv-btn" style={{ marginTop: 8 }} onClick={() => removeStep(setPendingRecipe, "steps", idx)}>✕</button>
                  </div>
                ))}
                <button className="btn-ghost" style={{ marginBottom: 16 }} onClick={() => addStep(setPendingRecipe, "steps")}>+ Step</button>

                <div style={{ marginTop: 8 }}>
                  <div className="flbl" style={{ marginBottom: 6 }}>Chef's Notes</div>
                  <textarea className="notes-area" placeholder="Tips, variations, cooking times, serving suggestions..." value={pendingRecipe.notes || ""}
                    onChange={e => updatePendingField("notes", e.target.value)} />
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button className="btn-save" onClick={savePendingRecipe}>Save to Collection</button>
                  <button className="btn-danger" onClick={() => setPendingRecipe(null)}>Discard</button>
                </div>
              </div>
            )}

            {/* Print selected bar */}
            {Object.values(printSelected).some(Boolean) && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", border: "1px solid rgba(180,150,60,0.3)", background: "rgba(180,150,60,0.06)", marginBottom: 16 }}>
                <span style={{ fontFamily: "'Cinzel',serif", fontSize: 9, letterSpacing: 2, color: "#b8963c" }}>
                  {Object.values(printSelected).filter(Boolean).length} recipe{Object.values(printSelected).filter(Boolean).length > 1 ? "s" : ""} selected for print
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-ghost" onClick={() => setPrintSelected({})}>Clear</button>
                  <button className="btn-gold" onClick={printRecipes}>🖨 Print Selected</button>
                </div>
              </div>
            )}

            {/* Recipe filter bar */}
            <div className="recipe-filter-bar">
              <span className="filter-lbl">Show:</span>
              <button className={`filter-btn ${recipeFilter === "all" ? "active" : ""}`}
                onClick={() => setRecipeFilter("all")}>All</button>
              <button className={`filter-btn ${recipeFilter === "menu" ? "active" : ""}`}
                onClick={() => setRecipeFilter("menu")}>
                This Week{menuRecipeIds.size > 0 ? ` (${menuRecipeIds.size})` : ""}
              </button>
              <div style={{ flex: 1 }} />
              <button className="filter-btn" onClick={() => setCollapsedCards({})}>
                Expand All
              </button>
              <button className="filter-btn" onClick={() => {
                const allIds = recipes.reduce((acc, r) => ({ ...acc, [r.id]: true }), {});
                setCollapsedCards(allIds);
              }}>
                Collapse All
              </button>
            </div>

            {/* Empty state for menu filter */}
            {recipeFilter === "menu" && menuRecipeIds.size === 0 && (
              <div className="empty">
                <div style={{ fontSize: 28, color: "#b8963c", opacity: 0.15, marginBottom: 12 }}>◇</div>
                <div className="etxt">No recipes on this week's menu</div>
                <div className="esub">Plan your week first, then filter to see what's on it</div>
                <button className="btn-ghost" style={{ marginTop: 16 }} onClick={() => setRecipeFilter("all")}>Show All Recipes</button>
              </div>
            )}

            {/* Recipe cards grouped by type */}
            {["Entrée","Side"].map(type => {
              let typed = recipes.filter(r => (r.recipeType || "Entrée") === type);
              if (recipeFilter === "menu") typed = typed.filter(r => menuRecipeIds.has(r.id));
              if (!typed.length) return null;
              return (
                <div key={type}>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 8, letterSpacing: 4, color: "#b8963c", textTransform: "uppercase", marginBottom: 10, marginTop: 20, paddingBottom: 6, borderBottom: "1px solid rgba(180,150,60,0.12)" }}>
                    ◆ &nbsp;{type === "Entrée" ? "Entrées" : "Sides"}
                  </div>
                  <div className="rgrid">
                    {typed.map(recipe => {
                      const isEditing = editingRecipe?.id === recipe.id;
                      if (isEditing) return (
                        <div key={recipe.id} className="rcard" style={{ borderColor: "rgba(180,150,60,0.4)", gridColumn: "1 / -1" }}>
                          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 8, letterSpacing: 2, color: "#b8963c", textTransform: "uppercase", marginBottom: 16 }}>✏ Editing Recipe</div>
                          <div style={{ display: "flex", gap: 14, marginBottom: 16, alignItems: "flex-end" }}>
                            <div style={{ flex: 1 }}>
                              <div className="flbl">Recipe Name</div>
                              <input className="ginput" style={{ fontSize: 17 }} value={editingRecipe.name}
                                onChange={e => updateEditingField("name", e.target.value)} />
                            </div>
                            <div>
                              <div className="flbl">Type</div>
                              <select className="gsel" style={{ width: "auto" }} value={editingRecipe.recipeType || "Entrée"}
                                onChange={e => updateEditingField("recipeType", e.target.value)}>
                                <option value="Entrée">Entrée</option>
                                <option value="Side">Side</option>
                              </select>
                            </div>
                          </div>
                          <div className="flbl" style={{ marginBottom: 8 }}>Ingredients</div>
                          {editingRecipe.ingredients.map((ing, idx) => (
                            <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 70px 110px 1.4fr auto", gap: 8, marginBottom: 8 }}>
                              <input className="ginput" placeholder="Ingredient" value={ing.name}
                                onChange={e => updateEditingIngredient(idx, "name", e.target.value)} />
                              <input className="ginput" placeholder="Qty" value={ing.qty}
                                onChange={e => updateEditingIngredient(idx, "qty", e.target.value)} />
                              <select className="gsel" value={ing.unit || "—"} onChange={e => updateEditingIngredient(idx, "unit", e.target.value)}>
                                {UNITS.map(u => <option key={u}>{u}</option>)}
                              </select>
                              <select className="gsel" value={ing.category}
                                onChange={e => updateEditingIngredient(idx, "category", e.target.value)}>
                                {STORE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                              </select>
                              <button className="btn-danger" style={{ padding: "6px 10px" }}
                                onClick={() => removeEditingIngredient(idx)}>✕</button>
                            </div>
                          ))}
                          <button className="btn-ghost" style={{ marginBottom: 20 }} onClick={addEditingIngredient}>+ Add Ingredient</button>

                          <div className="flbl" style={{ marginBottom: 8 }}>Steps</div>
                          {((editingRecipe.steps || []).length === 0 ? [""] : editingRecipe.steps).map((step, idx) => (
                            <div key={idx} className="step-row">
                              <span className="step-num">{idx + 1}.</span>
                              <textarea className="step-input" placeholder={`Step ${idx + 1}...`} value={step}
                                onChange={e => updateStep(setEditingRecipe, "steps", idx, e.target.value)} rows={2} />
                              <button className="rmv-btn" style={{ marginTop: 8 }} onClick={() => removeStep(setEditingRecipe, "steps", idx)}>✕</button>
                            </div>
                          ))}
                          <button className="btn-ghost" style={{ marginBottom: 16 }} onClick={() => addStep(setEditingRecipe, "steps")}>+ Step</button>

                          <div style={{ marginTop: 8 }}>
                            <div className="flbl" style={{ marginBottom: 6 }}>Chef's Notes</div>
                            <textarea className="notes-area" placeholder="Tips, variations, cooking times, serving suggestions..." value={editingRecipe.notes || ""}
                              onChange={e => updateEditingField("notes", e.target.value)} />
                          </div>
                          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
                            <button className="btn-save" onClick={saveEditingRecipe}>Save Changes</button>
                            <button className="btn-danger" onClick={() => { setEditingRecipe(null); setConfirmDeleteRecipeId(null); }}>Cancel</button>
                            <div style={{ flex: 1 }} />
                            {confirmDeleteRecipeId === editingRecipe.id ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1px solid rgba(180,60,60,0.45)", background: "rgba(180,60,60,0.07)" }}>
                                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 13, color: "#e08080" }}>Delete this recipe?</span>
                                <button className="btn-danger" style={{ padding: "5px 14px" }} onClick={() => {
                                  setRecipes(p => p.filter(r => r.id !== editingRecipe.id));
                                  setEditingRecipe(null);
                                  setConfirmDeleteRecipeId(null);
                                }}>Yes, delete</button>
                                <button className="btn-ghost" style={{ padding: "5px 12px" }} onClick={() => setConfirmDeleteRecipeId(null)}>No, keep it</button>
                              </div>
                            ) : (
                              <button className="btn-danger" style={{ opacity: 0.7 }} onClick={() => setConfirmDeleteRecipeId(editingRecipe.id)}>
                                🗑 Delete Recipe
                              </button>
                            )}
                          </div>
                        </div>
                      );
                      return (
                        <RecipeCard
                          key={recipe.id}
                          recipe={recipe}
                          isOpen={!collapsedCards[recipe.id]}
                          onToggle={() => setCollapsedCards(p => ({ ...p, [recipe.id]: !p[recipe.id] }))}
                          printSelected={!!printSelected[recipe.id]}
                          onPrintToggle={() => setPrintSelected(p => ({ ...p, [recipe.id]: !p[recipe.id] }))}
                          onEdit={() => { setPendingRecipe(null); startEditRecipe(recipe); }}
                          onDelete={null}
                          UNITS={UNITS}
                          STORE_CATEGORIES={STORE_CATEGORIES}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── SHOPPING LIST ── */}
        {tab === "shopping" && (
          <div>
            <div className="stitle">Market Order</div>
            <div className="shead">Shopping List</div>
            <div className="ssub">{remaining} of {shoppingList.length} items remaining · Checked items auto-remove after 24 hours</div>

            {/* Add manual item */}
            <div style={{ padding: "16px", border: "1px solid rgba(180,150,60,0.18)", background: "rgba(180,150,60,0.04)", marginBottom: 20 }}>
              <div className="flbl" style={{ marginBottom: 10 }}>Add Item</div>

              {/* Row 1: name + add button */}
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  className="ginput"
                  placeholder="Item name..."
                  value={newManualItem.name}
                  onChange={e => setNewManualItem(p => ({ ...p, name: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && addManualItem()}
                  style={{ flex: 1, fontSize: 16, padding: "10px 6px", minHeight: 44 }}
                />
                <button
                  className="btn-gold"
                  onClick={addManualItem}
                  style={{ minWidth: 64, minHeight: 44, fontSize: 18, padding: "0 14px", flexShrink: 0 }}
                >+</button>
              </div>

              {/* Row 2: qty · unit · category */}
              <div style={{ display: "grid", gridTemplateColumns: "72px 1fr 1.6fr", gap: 8 }}>
                <div>
                  <div className="flbl" style={{ fontSize: 7, marginBottom: 4 }}>Qty</div>
                  <input
                    className="ginput"
                    placeholder=""
                    value={newManualItem.qty}
                    onChange={e => setNewManualItem(p => ({ ...p, qty: e.target.value }))}
                    style={{ fontSize: 15, padding: "8px 4px", minHeight: 40, textAlign: "center" }}
                  />
                </div>
                <div>
                  <div className="flbl" style={{ fontSize: 7, marginBottom: 4 }}>Unit</div>
                  <select
                    className="gsel"
                    value={newManualItem.unit}
                    onChange={e => setNewManualItem(p => ({ ...p, unit: e.target.value }))}
                    style={{ minHeight: 40, fontSize: 14, padding: "8px 6px" }}
                  >
                    <option value="">—</option>
                    {UNITS.filter(u => u !== "—").map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flbl" style={{ fontSize: 7, marginBottom: 4 }}>Aisle</div>
                  <select
                    className="gsel"
                    value={newManualItem.category}
                    onChange={e => setNewManualItem(p => ({ ...p, category: e.target.value }))}
                    style={{ minHeight: 40, fontSize: 14, padding: "8px 6px" }}
                  >
                    <option value="">—</option>
                    {STORE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {shoppingList.length > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <button className="btn-ghost" onClick={() => setShowStaples(true)}>⭐ Staples</button>
                <button className="btn-ghost" onClick={printShoppingList}>🖨 Print</button>
                <button className="btn-ghost" onClick={() => setShoppingList(p => p.map(i => ({ ...i, checkedAt: null })))}>Uncheck All</button>
                <button className="btn-danger" onClick={() => setShoppingList([])}>Clear</button>
              </div>
            )}
            {shoppingList.length === 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
                <button className="btn-ghost" onClick={() => setShowStaples(true)}>⭐ Edit Staples</button>
              </div>
            )}

            {shoppingList.length === 0 ? (
              <div className="empty">
                <div style={{ fontSize: 32, color: "#b8963c", opacity: 0.15, marginBottom: 12 }}>◇</div>
                <div className="etxt">No items on your list</div>
                <div className="esub">Plan your menu and save to generate your list, or add items above</div>
                <button className="btn-ghost" style={{ marginTop: 16 }} onClick={() => setTab("planner")}>Go to Menu Planner</button>
              </div>
            ) : (
              <div className="shop-list">
                {Object.entries(grouped).map(([category, items]) => (
                  <div key={category}>
                    <div className="cathdr">◆ &nbsp;{category}</div>
                    {items.map(item => (
                      <div key={item.id} draggable
                        onDragStart={e => handleDragStart(e, item.id)}
                        onDragOver={e => handleDragOver(e, item.id)}
                        onDrop={e => handleDrop(e, item.id)}
                        onDragEnd={handleDragEnd}
                        className={`sitem ${item.checkedAt ? "chk" : ""} ${dragOver === item.id ? "dov" : ""}`}>
                        <div className={`cbox ${item.checkedAt ? "on" : ""}`} onClick={() => toggleCheck(item.id)}>
                          {item.checkedAt && <span style={{ color: "#b8963c", fontSize: 11 }}>✓</span>}
                        </div>
                        <span className={`iname ${item.checkedAt ? "cross" : ""}`} onClick={() => setEditingId(`${item.id}-name`)}>
                          {editingId === `${item.id}-name` ? (
                            <input autoFocus className="ginput" style={{ width: "100%" }} value={item.name}
                              onChange={e => updateItem(item.id, "name", e.target.value)}
                              onBlur={() => setEditingId(null)}
                              onKeyDown={e => e.key === "Enter" && setEditingId(null)} />
                          ) : item.name}
                        </span>
                        <span className="imeta">
                          {editingId === `${item.id}-qty` ? (
                            <input autoFocus className="ginput" style={{ width: 42 }} value={item.qty}
                              onChange={e => updateItem(item.id, "qty", e.target.value)}
                              onBlur={() => setEditingId(null)}
                              onKeyDown={e => e.key === "Enter" && setEditingId(null)} />
                          ) : (
                            <span className="iqty" onClick={() => setEditingId(`${item.id}-qty`)}>{item.qty}</span>
                          )}
                          {item.unit && item.unit !== "—" && <span className="iunit">{item.unit}</span>}
                        </span>
                        <button className="btn-danger" style={{ padding: "6px 10px", flexShrink: 0, fontSize: 13 }} onClick={() => removeItem(item.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── STAPLES MODAL ── */}
      {showStaples && (
        <div className="modal-overlay" onClick={() => setShowStaples(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 10, letterSpacing: 3, color: "#d4a843", textTransform: "uppercase", marginBottom: 4 }}>⭐ Weekly Staples</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 13, color: "#907848", marginBottom: 20 }}>These items repopulate your list every Monday. Edit names, quantities, or remove items below.</div>

            {/* Existing staples — all fields editable */}
            {staples.map((staple, idx) => (
              <div key={staple.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <input className="ginput" value={staple.name} placeholder="Item name"
                  onChange={e => setStaples(p => p.map((s, i) => i === idx ? { ...s, name: e.target.value } : s))}
                  style={{ flex: 1, fontSize: 14 }} />
                <input className="ginput" value={staple.qty} placeholder="Qty"
                  onChange={e => setStaples(p => p.map((s, i) => i === idx ? { ...s, qty: e.target.value } : s))}
                  style={{ width: 46, textAlign: "center", fontSize: 14 }} />
                <select className="gsel" value={staple.unit || ""}
                  onChange={e => setStaples(p => p.map((s, i) => i === idx ? { ...s, unit: e.target.value } : s))}
                  style={{ width: 68, fontSize: 12, padding: "6px 4px" }}>
                  <option value="">—</option>
                  {UNITS.filter(u => u !== "—").map(u => <option key={u}>{u}</option>)}
                </select>
                <button className="btn-danger" style={{ padding: "5px 9px", fontSize: 13, flexShrink: 0 }}
                  onClick={() => setStaples(p => p.filter((_, i) => i !== idx))}>✕</button>
              </div>
            ))}

            {/* Add new staple */}
            <div style={{ borderTop: "1px solid rgba(180,150,60,0.15)", marginTop: 14, paddingTop: 14 }}>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 8, letterSpacing: 2, color: "#907848", textTransform: "uppercase", marginBottom: 8 }}>Add Item</div>
              <StaplesAddRow onAdd={(item) => setStaples(p => [...p, { ...item, id: uid() }])} UNITS={UNITS} />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
              <button className="btn-ghost" onClick={() => {
                setShoppingList(prev => {
                  const updated = [...prev];
                  staples.forEach(staple => {
                    if (!staple.name.trim()) return;
                    const alreadyThere = updated.some(i => i.name.toLowerCase() === staple.name.toLowerCase());
                    if (!alreadyThere) updated.push({ ...staple, id: uid(), checkedAt: null });
                  });
                  return updated;
                });
                setShowStaples(false);
              }}>Add to List Now</button>
              <button className="btn-save" onClick={() => setShowStaples(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
