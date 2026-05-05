# components/ui — Reference

This project uses **base-nova** shadcn preset, which swaps Radix UI for `@base-ui/react`.
Key differences from standard shadcn: uses `render` prop instead of `asChild`, `nativeButton` instead of `asChild` bridge.

## button.tsx
- **Exports**: `Button`, `buttonVariants`, `ButtonProps`
- **Primitive**: `@base-ui/react/button` (ButtonPrimitive)
- **`asChild` bridge**: When `asChild=true`, renders `<Slot>` from `@radix-ui/react-slot` instead — this lets `Button asChild` wrap a Next.js `<Link>` without base-ui nativeButton conflicts
- **Variants**: `default | outline | secondary | ghost | destructive | link`
- **Sizes**: `default | xs | sm | lg | icon | icon-xs | icon-sm | icon-lg`
- **Pattern**: `<Button asChild size="lg"><Link href="/catalog">…</Link></Button>`

## sheet.tsx
- **Exports**: `Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription`
- **Primitive**: `@base-ui/react/dialog` (used as a side drawer)
- **`asChild` bridge**: `pickRenderChild(asChild, children)` helper converts asChild API → base-ui `render` prop
- **`nativeButton` rule**: `SheetClose` sets `nativeButton={asChild ? false : undefined}` — because SheetClose asChild wraps `<Link>` (an `<a>`, not `<button>`). SheetTrigger does NOT set nativeButton (wraps Button which IS a `<button>`)
- **`SheetContent` sides**: `"top" | "right" | "bottom" | "left"` (default: right), uses `data-[side=*]` CSS
- **Built-in close button**: X icon in top-right, `showCloseButton` prop to hide it

## navigation-menu.tsx
- **Exports**: `NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink, NavigationMenuIndicator, NavigationMenuPositioner, navigationMenuTriggerStyle`
- **Primitive**: `@base-ui/react/navigation-menu`
- Dropdown panel rendered via Portal+Positioner into a Popup with Viewport
- Trigger shows ChevronDown that rotates 180° when open (`data-popup-open`)
- NOT currently used in site-nav (site-nav uses plain Link pills instead)

## dropdown-menu.tsx
- **Exports**: `DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal`
- **Primitive**: `@base-ui/react/menu`
- Standard dropdown menu with Portal+Positioner rendering
- `DropdownMenuItem` supports `variant="destructive"` and `inset` prop
- NOT currently used in the app

## separator.tsx
- **Export**: `Separator`
- **Primitive**: `@base-ui/react/separator`
- `orientation="horizontal"` (default) or `"vertical"`
- Styled via `data-horizontal:h-px` / `data-vertical:w-px`

## badge.tsx
- **Export**: `Badge`, `badgeVariants`
- Uses base-ui `useRender` + `mergeProps` pattern (NOT cva + className only)
- Renders as `<span>` by default; can override via `render` prop
- **Variants**: `default | secondary | destructive | outline | ghost | link`
- `render` prop lets it render as `<a>` or any element
