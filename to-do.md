* Refactor content/attribute children
    * children array is aggregation of content and/or attributes; only used in drawing
    * element, choice, and seq nodes also have content array
    * element nodes also have attributes array

    * "expand" splits into "expand_content" and "expand_attributes"
    * Likewise, "collapse" -> "collapse_content" and "collapse_attributes"
    * _children goes away

* draw_enter
    * set width and y_size, for all Node types



* front has "any" content model - needs to be expandable

